// import express from "express";
// import multer from "multer";
// import { createClient } from "@supabase/supabase-js";
// import {
//     extractTextFromPdfPaddle
// } from "../documentOcrService/pdfLoaderPaddleService.js";
// import ws from "ws";

// const router = express.Router();

// const supabaseClient = createClient(
//     process.env.SUPABASE_URL,
//     process.env.SUPABASE_SERVICE_ROLE_KEY,
//     {
//         realtime: {
//             transport: ws
//         }
//     }
// );


// const upload = multer({
//     dest: "uploads/"
// });

// router.post(
//     // "/paddle-ocr/upload",
//      "/upload",
//     upload.single("document"),
//     async (req, res) => {

//         const startTime = Date.now();

//         const result =
//             await extractTextFromPdfPaddle(
//                 req.file.path
//             );

//         const processingTime =
//             Date.now() - startTime;

//         await supabaseClient
//             .from("paddle_ocr_results")
//             .insert({
//                 file_name: req.file.originalname,
//                 file_type: req.file.mimetype,
//                 file_size: req.file.size,
//                 pages_count: result.pagesCount,
//                 processing_time_ms: processingTime,
//                 extracted_characters:
//                     result.text.length,
//                 confidence:
//                     result.confidence,
//                 extracted_text:
//                     result.text
//             });

//         res.json(result);
//     }
// );

// export default router;


import express from "express";
import multer from "multer";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { extractTextFromPdfPaddle } from "../documentOcrService/pdfLoaderPaddleService.js";
import { extractTextWithPaddle } from "../documentOcrService/paddleOcrService.js"; // Added image OCR service
import ws from "ws";

const router = express.Router();

const supabaseClient = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
        realtime: {
            transport: ws
        }
    }
);

const upload = multer({
    dest: "uploads/"
});

router.post(
    "/upload",
    upload.single("document"),
    async (req, res) => {
        const startTime = Date.now();
        const filePath = req.file.path;
        const fileExtension = path.extname(req.file.originalname).toLowerCase();
        
        let result = {
            success: false,
            text: "",
            pagesCount: 0,
            confidence: 1.0 // Default baseline fallback value
        };

        try {
            // ==========================================
            // CASE 1: ROUTE TO HYBRID PIPELINE FOR PDFs
            // ==========================================
            if (fileExtension === ".pdf") {
                result = await extractTextFromPdfPaddle(filePath);
            } 
            // ==========================================
            // CASE 2: ROUTE DIRECTLY TO PADDLEOCR FOR IMAGES
            // ==========================================
            else if ([".png", ".jpg", ".jpeg", ".bmp"].includes(fileExtension)) {
                console.log(`Direct Image Upload Detected: ${filePath}`);
                
                // Directly contact your Python FastAPI layer, bypassing PDF extraction scripts
                const ocrResult = await extractTextWithPaddle(filePath);
                const ocrText = ocrResult?.text || "";

                result = {
                    success: true,
                    text: `--- IMAGE UPLOAD ---\nMethod: DIRECT PADDLE OCR\n\n${ocrText}`,
                    pagesCount: 1,
                    confidence: 1.0 // You can adjust this if your python service passes back an accurate average text confidence array
                };
            } 
            else {
                return res.status(400).json({ 
                    success: false, 
                    error: `Unsupported format type: ${fileExtension}. Only PDFs and common image types are supported.` 
                });
            }

            const processingTime = Date.now() - startTime;

            // Save processing data telemetry seamlessly into Supabase tables
            await supabaseClient
                .from("paddle_ocr_results")
                .insert({
                    file_name: req.file.originalname,
                    file_type: req.file.mimetype,
                    file_size: req.file.size,
                    pages_count: result.pagesCount,
                    processing_time_ms: processingTime,
                    extracted_characters: result.text.length,
                    confidence: result.confidence || 1.0,
                    extracted_text: result.text
                });

            res.json(result);

        } catch (error) {
            console.error("Routing extraction execution error:", error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
);

export default router;