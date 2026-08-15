import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import path from "path"; // Added to parse file metadata cleanly

// --- Inside documentOcrService/ocrSpaceService.js ---
export async function extractTextWithOcrSpace(filePath, originalName) {
    try {
        const apiKey = process.env.OCR_SPACE_API_KEY;
        if (!apiKey) {
            throw new Error("OCR_SPACE_API_KEY is missing from environment variables.");
        }

        const form = new FormData();
        
        // FIXED: Instead of using the raw hash name, pass the original client filename (with extension!)
        form.append("file", fs.createReadStream(filePath), { filename: originalName });
        
        form.append("apikey", apiKey);                      
        form.append("language", "eng");                     
        form.append("isTable", "true");                     
        form.append("detectOrientation", "true");           
        form.append("scale", "true");                       
        form.append("OCREngine", "3"); 

        console.log(`Sending structured payload (${originalName}) directly to OCR.space Cloud...`);

        const response = await axios.post("https://api.ocr.space/parse/image", form, {
            headers: { ...form.getHeaders() },
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });

        if (response.data.IsErroredOnProcessing) {
            throw new Error(`OCR.space execution error: ${response.data.ErrorMessage?.[0] || "Unknown processing error"}`);
        }

        const parsedResults = response.data.ParsedResults || [];
        let combinedExtractedText = "";
        parsedResults.forEach((page) => {
            if (page.ParsedText) combinedExtractedText += page.ParsedText + "\n";
        });

        return {
            success: true,
            text: combinedExtractedText.trim(),
            pagesCount: parsedResults.length || 1,
            confidence: 1.0 
        };
    } catch (error) {
        console.error("Failed to extract data via OCR.space Cloud Core:", error.message);
        return { success: false, text: "", pagesCount: 0, error: error.message };
    }
}