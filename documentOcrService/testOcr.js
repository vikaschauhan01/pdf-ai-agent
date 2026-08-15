import { extractTextFromImage } from "./tesseractService.js";

async function run() {
  const result = await extractTextFromImage(
    "./uploads/sample.png"
  );

  console.log("\n===== OCR RESULT =====\n");
  console.log(result.text);
}

run();