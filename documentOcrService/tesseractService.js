import Tesseract from "tesseract.js";
import fs from "fs";

export async function extractTextFromImage(imagePath) {
  try {
    // Check if file exists
    if (!fs.existsSync(imagePath)) {
      throw new Error(`File not found: ${imagePath}`);
    }

    console.log(`Starting OCR for: ${imagePath}`);

    const {
      data: { text, confidence },
    } = await Tesseract.recognize(
      imagePath,
      "eng",
      {
        logger: (m) => {
          if (m.status) {
            console.log(
              `${m.status} ${m.progress ? (m.progress * 100).toFixed(0) + "%" : ""}`
            );
          }
        },
      }
    );

    console.log(`OCR completed`);
    console.log(`Confidence: ${confidence}%`);

    return {
      success: true,
      text,
      confidence,
    };
  } catch (error) {
    console.error("OCR Error:", error);

    return {
      success: false,
      text: "",
      confidence: 0,
      error: error.message,
    };
  }
}