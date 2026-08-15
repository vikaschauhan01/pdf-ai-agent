import express from "express";
import multer from "multer";
import { processPDF, answerPDFQuestion } from "./pdfservice.js";
import interviewRoutes from "./routes/interviewRoutes.js";
import ocrRoutes from "./routes/ocrRoutes.js";
import paddleOcrRoutes from "./routes/paddleOcrRoutes.js";
import ocrSpaceCompareRoutes from "./routes/ocrSpaceRoutes.js";
import geminiOcrRoutes from "./routes/geminiocrRoutes.js";

import webscrapRoutes from './routes/webscrapRoutes.js';
// import speakInterviewRoutes from './routes/speakInterviewRoutes.js';

import fs from "fs/promises";

const app = express();
const upload = multer({ dest: "uploads/" });

app.use(express.json());
app.use(express.static("public"));

// Upload Route
// app.post("/upload", upload.single("file"), async (req, res) => {
//   try {
//     const sessionId = req.headers["x-session-id"]; // 👈 Get session tracking ID from headers
//     if (!req.file) return res.status(400).json({ error: "No file uploaded." });
//     if (!sessionId) return res.status(400).json({ error: "Missing session tracking ID." });

//     await processPDF(req.file.path, sessionId);
//     res.json({ message: "PDF processed successfully! Old session data replaced." });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: "Failed to process PDF processing sequence." });
//   }
// });

//this is used to process the uploaded PDF and store its embeddings in Supabase and then delete the file from the uploads folder. It also handles errors and returns appropriate responses to the client.
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const sessionId = req.headers["x-session-id"];

    await processPDF(req.file.path, sessionId);

    res.json({
      message: "PDF processed successfully!"
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Failed to process PDF."
    });
  } finally {
    if (req.file?.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (e) {
        console.error("Failed to delete temp file:", e);
      }
    }
  }
});

// Chat Question Route
app.post("/ask", async (req, res) => {
  try {
    const sessionId = req.headers["x-session-id"]; // 👈 Get session tracking ID from headers
    const { question } = req.body;

    if (!question) return res.status(400).json({ error: "Question is required." });
    if (!sessionId) return res.status(400).json({ error: "Missing session tracking ID." });

    const answer = await answerPDFQuestion(question, sessionId);
    res.json({ answer });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred while synthesizing an answer." });
  }
});


//for interview
app.use("/api/interview", interviewRoutes);

app.use("/document-extractor", ocrRoutes);

app.use("/paddle-ocr", paddleOcrRoutes);

app.use("/ocr-space", ocrSpaceCompareRoutes);
app.use("/api/gemini-ocr", geminiOcrRoutes);

app.use('/api', webscrapRoutes);

// app.use('/api/speak-interview', speakInterviewRoutes);


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Production AI Agent API live on: http://localhost:${PORT}`);
});

