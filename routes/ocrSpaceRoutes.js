// import express from "express";
// import multer from "multer";
// import path from "path";
// import { createClient } from "@supabase/supabase-js"; // 1. Import Supabase
// import { extractTextWithOcrSpace } from "../documentOcrService/ocrSpaceService.js";
// import ws from "ws";

// const router = express.Router();
// const upload = multer({ dest: "uploads/" });

// // 2. Initialize your Supabase client (reusing the configuration pattern you have)
// const supabaseClient = createClient(
//     process.env.SUPABASE_URL,
//     process.env.SUPABASE_SERVICE_ROLE_KEY,
//     {
//         realtime: {
//             transport: ws
//         }
//     }
// );

// // =================================================================
// // DEDICATED ROUTE FOR RAW OCR.SPACE TEXT PAYLOAD + DATABASE STORAGE
// // URL: POST http://localhost:3000/ocr-space/compare
// // =================================================================
// router.post(
//     "/compare",
//     upload.single("document"),
//     async (req, res) => {
//         const startTime = Date.now();
//         const filePath = req.file.path;
//         const fileExtension = path.extname(req.file.originalname).toLowerCase();
        
//         try {
//             // Basic format validation
//             if (![".pdf", ".png", ".jpg", ".jpeg", ".bmp"].includes(fileExtension)) {
//                 return res.status(400).json({ success: false, error: "Unsupported file type." });
//             }

//             console.log(`[OCR.space Isolation] Sending file to cloud engine...`);
            
//             // Invoke the OCR.space engine
//             const ocrResult = await extractTextWithOcrSpace(filePath);

//             if (!ocrResult.success || !ocrResult.text || ocrResult.text.trim() === "") {
//                 return res.status(422).json({ 
//                     success: false, 
//                     error: ocrResult.error || "OCR.space returned an empty text layer." 
//                 });
//             }

//             const processingTime = Date.now() - startTime;

//             // 3. Save telemetry and text block to the new ocr_space_results table
//             console.log("Persisting OCR.space metrics to Supabase...");
//             await supabaseClient
//                 .from("ocr_space_results")
//                 .insert({
//                     file_name: req.file.originalname,
//                     file_type: req.file.mimetype,
//                     file_size: req.file.size,
//                     pages_count: ocrResult.pagesCount,
//                     processing_time_ms: processingTime,
//                     extracted_characters: ocrResult.text.length,
//                     confidence: ocrResult.confidence || 1.0,
//                     extracted_text: ocrResult.text
//                 });

//             // Return strictly the raw text payload to evaluate layout processing
//             res.json({
//                 success: true,
//                 engine: "ocr_space_engine_3_raw",
//                 processing_time_ms: processingTime,
//                 pages_count: ocrResult.pagesCount,
//                 raw_text: ocrResult.text
//             });

//         } catch (error) {
//             console.error("Error in dedicated OCR.space comparison route:", error);
//             res.status(500).json({ success: false, error: error.message });
//         }
//     }

    
// );

// export default router;


import express from "express";
import multer from "multer";
import path from "path";
import { createClient } from "@supabase/supabase-js"; 
import { extractTextWithOcrSpace } from "../documentOcrService/ocrSpaceService.js";
import ws from "ws";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// Initialize Supabase client
const supabaseClient = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
        realtime: {
            transport: ws
        }
    }
);

// =================================================================
// DEDICATED ROUTE FOR RAW OCR.SPACE TEXT PAYLOAD + DATABASE STORAGE
// URL: POST http://localhost:3000/ocr-space/compare
// =================================================================
router.post(
    "/compare",
    upload.single("document"),
    async (req, res) => {
        const startTime = Date.now();
        const filePath = req.file.path;
        const fileExtension = path.extname(req.file.originalname).toLowerCase();
        
        try {
            // Basic format validation
            if (![".pdf", ".png", ".jpg", ".jpeg", ".bmp"].includes(fileExtension)) {
                return res.status(400).json({ success: false, error: "Unsupported file type." });
            }

            console.log(`[OCR.space Isolation] Sending file to cloud engine...`);
            
            // FIXED: Added req.file.originalname here so the service has the extension context!
            const ocrResult = await extractTextWithOcrSpace(filePath, req.file.originalname);

            if (!ocrResult.success || !ocrResult.text || ocrResult.text.trim() === "") {
                return res.status(422).json({ 
                    success: false, 
                    error: ocrResult.error || "OCR.space returned an empty text layer." 
                });
            }

            const processingTime = Date.now() - startTime;

            // Save telemetry metrics directly to Supabase
            console.log("Persisting OCR.space metrics to Supabase...");
            await supabaseClient
                .from("ocr_space_results")
                .insert({
                    file_name: req.file.originalname,
                    file_type: req.file.mimetype,
                    file_size: req.file.size,
                    pages_count: ocrResult.pagesCount,
                    processing_time_ms: processingTime,
                    extracted_characters: ocrResult.text.length,
                    confidence: ocrResult.confidence || 1.0,
                    extracted_text: ocrResult.text
                });

            // Return strictly the raw text payload for testing
            return res.json({
                success: true,
                engine: "ocr_space_engine_3_raw",
                processing_time_ms: processingTime,
                pages_count: ocrResult.pagesCount,
                raw_text: ocrResult.text
            });

        } catch (error) {
            console.error("Error in dedicated OCR.space comparison route:", error);
            return res.status(500).json({ success: false, error: error.message });
        }
    }
); // FIXED: Added the proper closing parenthesis and bracket for the router handler here!

export default router;