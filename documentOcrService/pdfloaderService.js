
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import fs from "fs";
import { fromPath } from "pdf2pic";
import { extractTextFromImage } from "./tesseractService.js";
import { hasImages } from "./pdfImageDetector.js";
// import { extractPageImagesOnly } from "./pdfImageDetector.js";


export async function extractTextFromPdf(pdfPath) {

    try {

        if (!fs.existsSync(pdfPath)) {
            throw new Error(`File not found: ${pdfPath}`);
        }


        console.log(`Starting PDF extraction: ${pdfPath}`);


        const loader = new PDFLoader(pdfPath);

        const docs = await loader.load();


        const pages = docs.map((doc, index) => ({

            pageNumber: index + 1,

            text: doc.pageContent,

            textLength: doc.pageContent.trim().length

        }));


        let finalText = "";


        // convert page to image if detected image in the page
        const convert = fromPath(pdfPath, {
            density: 300,
            savePath: "./uploads",
            format: "png"
        });

        // const extractedImages = await extractPageImagesOnly(pdfPath, page.pageNumber);
        // console.log(`Page ${page.pageNumber} Isolated Images Found: ${extractedImages.length}`);

        // if (extractedImages.length > 0) {
        //     let accumulatedOcrText = "";
        //     for (const imgPath of extractedImages) {
        //         const ocrResult = await extractTextFromImage(imgPath);
        //         if (ocrResult.success && ocrResult.text.trim().length > 0) {
        //             accumulatedOcrText += ocrResult.text + "\n";
        //         }
        //         if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
        //     }
        //     pageContent += "\n" + accumulatedOcrText;
        // }


        for (const page of pages) {


            let pageContent = "";

            let pdfTextCharacters = 0;

            let ocrCharacters = 0;


            let extractionMethod = "";



            // 1. PDF Text Extraction
            if (page.textLength > 0) {

                pdfTextCharacters = page.textLength;

                pageContent += page.text;

            }



            // 2. Detect Image
            // const imageExists = await hasImages(
            //     pdfPath,
            //     page.pageNumber
            // );

            const imageExists = await hasImages(
                pdfPath,
                page.pageNumber
            );


            console.log(
                `Page ${page.pageNumber} Image Found: ${imageExists}`
            );



            if (imageExists) {

                console.log(
                    `Page ${page.pageNumber}: Image detected. Running OCR...`
                );


                const image = await convert(
                    page.pageNumber
                );


                const ocrResult =
                    await extractTextFromImage(
                        image.path
                    );


                ocrCharacters =
                    ocrResult.text.trim().length;



                pageContent += "\n" + ocrResult.text;

            }

            // 3. Extraction Type
            if (pdfTextCharacters > 0 && ocrCharacters > 0) {

                extractionMethod = "TEXT + OCR";

            }
            else if (pdfTextCharacters > 0) {

                extractionMethod = "PDF TEXT ONLY";

            }
            else if (ocrCharacters > 0) {

                extractionMethod = "OCR ONLY";

            }
            else {

                extractionMethod = "EMPTY";

            }



            console.log(`
--------------------------------
Page Number: ${page.pageNumber}

PDF Text Characters: ${pdfTextCharacters}

OCR Characters: ${ocrCharacters}

Extraction Method: ${extractionMethod}
--------------------------------
            `);



            finalText += `

--- PAGE ${page.pageNumber} ---
Method: ${extractionMethod}

${pageContent}

`;

        }



        console.log(`Pages Loaded: ${docs.length}`);

        console.log(
            `Characters Extracted: ${finalText.length}`
        );



        return {

            success: true,

            text: finalText,

            pagesCount: docs.length,

            pages

        };


    }
    catch (error) {

        console.error(
            "PDF Extraction Error:",
            error
        );


        return {

            success: false,

            text: "",

            pagesCount: 0,

            pages: [],

            error: error.message

        };

    }

}