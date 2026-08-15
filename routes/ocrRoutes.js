import express from "express";
import multer from "multer";
import { extractTextFromImage } from "../documentOcrService/tesseractService.js";
import { createClient } from "@supabase/supabase-js";
import ws from "ws";

import { extractTextFromPdf } from "../documentOcrService/pdfloaderService.js";


const supabaseClient = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
        realtime: {
            transport: ws
        }
    }
);

const router = express.Router();

const upload = multer({
    dest: "uploads/"
});

router.post(
    "/upload",
    upload.single("document"),
    async (req, res) => {

        try {

            // used for terract libraries to extract text from image files
            // const textResult =
            //     await extractTextFromImage(
            //         req.file.path
            //     );

            // used for pdf loader libraries to extract text from pdf files

            let textResult;

            if (req.file.mimetype === "application/pdf") {

                textResult = await extractTextFromPdf(
                    req.file.path
                );

            } else {

                textResult = await extractTextFromImage(
                    req.file.path
                );

            }

            if (!textResult.success) {
                return res.status(500).json({
                    success: false,
                    message: textResult.error
                });
            }

            const { data, error } =
                await supabaseClient
                    .from("raw_documents")
                    .insert({
                        file_name: req.file.originalname,
                        file_type: req.file.mimetype,
                        raw_text: textResult.text,
                        confidence: textResult.confidence
                    })
                    .select()
                    .single();

            if (error) {
                throw error;
            }

            res.json({
                success: true,
                documentId: data.id,
                text: textResult.text
            });

        } catch (error) {

            res.status(500).json({
                success: false,
                message: error.message
            });

        }
    }
);




export default router;