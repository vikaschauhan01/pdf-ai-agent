import dotenv from "dotenv";
dotenv.config();

import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createClient } from "@supabase/supabase-js";
import ws from "ws";

const supabaseClient = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    realtime: { transport: ws },
    auth: { persistSession: false },
  }
);

const model = new ChatGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY,
  model: "gemini-flash-lite-latest",
  temperature: 0.3,
});

/**
 * Upload Resume + Extract Text
 */
export async function processResume(filePath, interviewId, resumeUrl) {
  try {
    const loader = new PDFLoader(filePath);
    const docs = await loader.load();

    const resumeText = docs
      .map((doc) => doc.pageContent)
      .join("\n\n");

    await supabaseClient
      .from("interviews")
      .update({
        resume_url: resumeUrl,
        resume_text: resumeText,
        status: "resume_uploaded",
      })
      .eq("id", interviewId);

    return resumeText;
  } catch (error) {
    console.error("Resume processing error:", error);
    throw error;
  }
}

/**
 * Generate Interview Questions
 */
export async function generateQuestions(interviewId) {
  try {
    const { data, error } = await supabaseClient
      .from("interviews")
      .select("*")
      .eq("id", interviewId)
      .single();

    if (error) throw error;

    const prompt = `
You are a technical interviewer.

Based on this resume:

${data.resume_text}

Generate 5 interview questions.

Return ONLY valid JSON.

Example:

[
  {
    "question_no": 1,
    "question": "Explain React Hooks."
  }
]
`;

    const response = await model.invoke(prompt);

    const questions = JSON.parse(response.content);

    await supabaseClient
      .from("interviews")
      .update({
        questions,
        status: "questions_generated",
      })
      .eq("id", interviewId);

    return questions;
  } catch (error) {
    console.error("Question generation error:", error);
    throw error;
  }
}

/**
 * Evaluate Candidate Answer
 */
export async function evaluateAnswer(
  interviewId,
  questionNo,
  answer
) {
  try {
    const { data, error } = await supabaseClient
      .from("interviews")
      .select("*")
      .eq("id", interviewId)
      .single();

    if (error) throw error;

    const question = data.questions.find(
      (q) => q.question_no === questionNo
    );

    const prompt = `
You are an expert interviewer.

Question:
${question.question}

Candidate Answer:
${answer}

Evaluate the answer.

Return ONLY JSON:

{
  "score": 8,
  "feedback": "Good understanding",
  "strengths": [
    "Explained hooks"
  ],
  "weaknesses": [
    "Missed dependency array"
  ]
}
`;

    const response = await model.invoke(prompt);

    const evaluation = JSON.parse(response.content);

    const answers = data.answers || [];

    answers.push({
      question_no: questionNo,
      question: question.question,
      answer,
      score: evaluation.score,
      feedback: evaluation.feedback,
      strengths: evaluation.strengths,
      weaknesses: evaluation.weaknesses,
    });

    await supabaseClient
      .from("interviews")
      .update({
        answers,
      })
      .eq("id", interviewId);

    return evaluation;
  } catch (error) {
    console.error("Answer evaluation error:", error);
    throw error;
  }
}

/**
 * Final Interview Report
 */
export async function generateFinalReport(interviewId) {
  try {
    const { data, error } = await supabaseClient
      .from("interviews")
      .select("*")
      .eq("id", interviewId)
      .single();

    if (error) throw error;

    const answers = data.answers || [];

    const totalScore =
      answers.reduce(
        (sum, item) => sum + Number(item.score || 0),
        0
      ) / answers.length;

    const prompt = `
Interview Results:

${JSON.stringify(answers)}

Generate final interview report.

Return ONLY JSON:

{
  "recommendation": "Proceed to next round",
  "final_feedback": "Strong React and Node.js knowledge."
}
`;

    const response = await model.invoke(prompt);

    const report = JSON.parse(response.content);

    await supabaseClient
      .from("interviews")
      .update({
        total_score: totalScore,
        recommendation: report.recommendation,
        final_feedback: report.final_feedback,
        status: "completed",
      })
      .eq("id", interviewId);

    return {
      totalScore,
      ...report,
    };
  } catch (error) {
    console.error("Final report error:", error);
    throw error;
  }
}