
import express from "express";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import { createClient } from "@supabase/supabase-js";
import ws from "ws";

import {
  processResume,
  generateQuestions,
  evaluateAnswer,
  generateFinalReport,
} from "../interview.js";

const router = express.Router();

const supabaseClient = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    realtime: { transport: ws },
    auth: { persistSession: false },
  }
);

const upload = multer({
  dest: "uploads/",
});

/**
 * POST /api/interview/start
 */
router.post(
  "/start",
  upload.single("resume"),
  async (req, res) => {
    try {
      const { candidate_name, position } = req.body;

      const interviewId = uuidv4();

      const { error } = await supabaseClient
        .from("interviews")
        .insert({
          id: interviewId,
          candidate_name,
          position,
          status: "created",
          questions: [],
          answers: [],
        });

      if (error) throw error;

      await processResume(
        req.file.path,
        interviewId,
        req.file.filename
      );

      const questions =
        await generateQuestions(interviewId);

      res.json({
        success: true,
        interviewId,
        question: questions[0]?.question,
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * POST /api/interview/answer
 */
router.post("/answer", async (req, res) => {
  try {
    const {
      interviewId,
      questionNo,
      answer,
    } = req.body;

    const evaluation =
      await evaluateAnswer(
        interviewId,
        questionNo,
        answer
      );

    const { data } = await supabaseClient
      .from("interviews")
      .select("questions")
      .eq("id", interviewId)
      .single();

    const nextQuestion =
      data.questions?.find(
        (q) =>
          q.question_no ===
          Number(questionNo) + 1
      );

    if (!nextQuestion) {
      const report =
        await generateFinalReport(
          interviewId
        );

      return res.json({
        completed: true,
        score: evaluation.score,
        feedback: evaluation.feedback,
        report,
      });
    }

    res.json({
      completed: false,
      score: evaluation.score,
      feedback: evaluation.feedback,
      nextQuestion:
        nextQuestion.question,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/interview/result/:id
 */
router.get("/result/:id", async (req, res) => {
  try {
    const { data, error } =
      await supabaseClient
        .from("interviews")
        .select("*")
        .eq("id", req.params.id)
        .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;

