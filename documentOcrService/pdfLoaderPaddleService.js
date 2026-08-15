
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import fs from "fs";
// Removed: fromPath from pdf2pic
// Removed: hasImages
import { extractPageImagesOnly } from "./pdfImageDetector.js";
import { extractTextWithPaddle } from "./paddleOcrService.js";

export async function extractTextFromPdfPaddle(pdfPath) {
    try {
        if (!fs.existsSync(pdfPath)) {
            throw new Error(`File not found: ${pdfPath}`);
        }

        console.log(`Starting Hybrid Isolated PaddleOCR Extraction: ${pdfPath}`);
        const loader = new PDFLoader(pdfPath);
        const docs = await loader.load();

        const pages = docs.map((doc, index) => ({
            pageNumber: index + 1,
            text: doc.pageContent,
            textLength: doc.pageContent.trim().length
        }));

        let finalText = "";

        for (const page of pages) {
            let pageContent = "";
            let pdfTextCharacters = 0;
            let ocrCharacters = 0;
            let extractionMethod = "EMPTY";

            // 1. ALWAYS grab native text first if it exists
            if (page.textLength > 0) {
                pdfTextCharacters = page.textLength;
                pageContent += page.text + "\n";
                extractionMethod = "PDF TEXT";
            }

            // 2. Extract ONLY standalone, raw image objects from the page canvas
            const extractedImages = await extractPageImagesOnly(pdfPath, page.pageNumber);
            console.log(`Page ${page.pageNumber} Isolated Images Found: ${extractedImages.length}`);

            // 3. If authentic embedded images exist, pass each one to PaddleOCR
            if (extractedImages.length > 0) {
                let accumulatedOcrText = "";
                
                for (const imgPath of extractedImages) {
                    const start = Date.now();
                    
                    // Call your Python FastAPI server with the isolated image asset path
                    const ocrResult = await extractTextWithPaddle(imgPath);
                    const timeTaken = Date.now() - start;

                    const ocrText = ocrResult?.text || "";
                    ocrCharacters += ocrText.trim().length;

                    if (ocrText.trim().length > 0) {
                        accumulatedOcrText += ocrText + "\n";
                    }

                    console.log(`PaddleOCR Target Asset Time: ${timeTaken} ms`);
                    
                    // Delete the temporary isolated image asset to prevent local disk bloating
                    if (fs.existsSync(imgPath)) {
                        fs.unlinkSync(imgPath);
                    }
                }

                // If text was found inside the images, append it safely
                if (ocrCharacters > 0) {
                    pageContent += "\n[Extracted Image Data]:\n" + accumulatedOcrText;
                    extractionMethod = extractionMethod === "PDF TEXT" ? "HYBRID (TEXT + OCR)" : "PADDLE OCR ONLY";
                }
            }

            console.log(`
--------------------------------
Page Number: ${page.pageNumber}
PDF Text Characters: ${pdfTextCharacters}
OCR Characters: ${ocrCharacters}
Extraction Method: ${extractionMethod}
--------------------------------
            `);

            finalText += `\n--- PAGE ${page.pageNumber} ---\nMethod: ${extractionMethod}\n\n${pageContent}\n`;
        }

        return {
            success: true,
            text: finalText,
            pagesCount: docs.length
        };

    } catch (error) {
        console.error("PaddleOCR Extraction Error:", error);
        return { success: false, text: "", error: error.message };
    }
}