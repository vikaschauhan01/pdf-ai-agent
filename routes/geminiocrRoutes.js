
// import express from 'express';
// import multer from 'multer';
// import fs from 'fs';
// import path from 'path';
// import ws from 'ws';
// import axios from 'axios'; // 👈 Added back to communicate with your Python OCR server for direct images
// import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf"; 
// import { createClient } from '@supabase/supabase-js';
// import { structureOcrText } from '../ProductService/geminiOcrService.js';
// import { extractPageImagesOnly } from '../documentOcrService/pdfImageDetector.js'; 

// const supabaseUrl = process.env.SUPABASE_URL;
// const supabaseKey = process.env.SUPABASE_ANON_KEY;
// const supabase = createClient(supabaseUrl, supabaseKey, {
//   auth: { persistSession: false },
//   global: { fetch: globalThis.fetch },
//   realtime: { transport: ws }
// });

// const router = express.Router();
// const upload = multer({ dest: 'uploads/' });

// // Target Endpoint: POST http://localhost:3000/api/gemini-ocr/process-spec
// router.post('/process-spec', upload.array('files'), async (req, res) => {
//   const processedRecords = [];
//   const pathsToCleanup = [];

//   try {
//     if (!req.files || req.files.length === 0) {
//       return res.status(400).json({ success: false, error: 'Missing uploaded documents payload batch.' });
//     }

//     console.log(`Starting optimized execution chain for a batch of ${req.files.length} file(s)...`);

//     for (const file of req.files) {
//       const originalExt = path.extname(file.originalname).toLowerCase();
//       const fixedFilePath = `${file.path}${originalExt}`;
      
//       // Rename incoming file to include the correct extension
//       await fs.promises.rename(file.path, fixedFilePath);
//       pathsToCleanup.push(fixedFilePath);
      
//       const absoluteFilePath = path.resolve(fixedFilePath);
//       const isImage = ['.png', '.jpg', '.jpeg', '.bmp', '.webp'].includes(originalExt);

//       // ────────────────────────────────────────────────────────
//       // 📸 MODE A: DIRECT IMAGE UPLOAD ROUTE
//       // ────────────────────────────────────────────────────────
//       if (isImage) {
//         console.log(`📸 Image detected: Processing via pure PaddleOCR + Gemini...`);
        
//         // 1. Convert the entire source image into a Base64 string for the database thumbnail preview
//         const imageBuffer = await fs.promises.readFile(absoluteFilePath);
//         const base64Str = imageBuffer.toString('base64');
//         const supabaseImagePayload = [`data:image/${originalExt.replace('.', '')};base64,${base64Str}`];

//         // 2. Dispatch image file path out to your running Python FastAPI microservice
//         const pythonResponse = await axios.post('http://127.0.0.1:8001/ocr', {
//           image_path: absoluteFilePath
//         });

//         const rawTextFromPaddle = pythonResponse.data.text;
//         if (!rawTextFromPaddle || rawTextFromPaddle.trim().length === 0) {
//           console.warn(`Empty OCR extraction mapping for image asset: ${file.originalname}`);
//           continue;
//         }

//         // 3. Request structural JSON conversion from Gemini
//         const cleanProductData = await structureOcrText(rawTextFromPaddle);

//         // 4. Assemble standard payload
//         const databasePayload = {
//           project_name: cleanProductData.project_name || null,
//           scheme: cleanProductData.scheme || null,
//           inn_code: cleanProductData.inn_code || null,
//           renovation_id: cleanProductData.renovation_id || null,
//           issue_date: cleanProductData.issue_date || null,
//           revisions: cleanProductData.revisions || null,
//           item_number: cleanProductData.item_number || null,
//           item_name: cleanProductData.item_name || null,
//           description: cleanProductData.description || null,
//           product_name: cleanProductData.product_name || null,
//           product_number: cleanProductData.product_number || null,
//           color_finish: cleanProductData.color_finish || null,
//           dimensions: cleanProductData.dimensions || null,
//           notes: cleanProductData.notes || null,
//           product_images: supabaseImagePayload
//         };

//         // 5. Store in Supabase
//         const { data, error } = await supabase.from('project_items').insert([databasePayload]).select();
//         if (error) throw error;
//         if (data && data[0]) processedRecords.push(data[0]);

//       // ────────────────────────────────────────────────────────
//       // ⚡ MODE B: HYBRID PDF UPLOAD ROUTE
//       // ────────────────────────────────────────────────────────
//       } else if (originalExt === '.pdf') {
//         console.log(`⚡ PDF detected: Starting Hybrid Isolated Extraction pipeline on: ${absoluteFilePath}`);
        
//         const loader = new PDFLoader(absoluteFilePath);
//         const docs = await loader.load();

//         let pageNumber = 1;
//         for (const doc of docs) {
//           let pageContent = doc.pageContent || "";
//           let supabaseImagePayload = [];

//           // Surgically slice out embedded image objects as .bmp files
//           const extractedBmpPaths = await extractPageImagesOnly(absoluteFilePath, pageNumber);
          
//           if (extractedBmpPaths && extractedBmpPaths.length > 0) {
//             console.log(`Page ${pageNumber}: Found ${extractedBmpPaths.length} visual asset elements.`);
            
//             const targetBmp = extractedBmpPaths[0];
//             if (fs.existsSync(targetBmp)) {
//               const imageBuffer = await fs.promises.readFile(targetBmp);
//               const base64Str = imageBuffer.toString('base64');
//               supabaseImagePayload.push(`data:image/bmp;base64,${base64Str}`);
//             }

//             // Cleanup isolated sub-image slices from local disk storage
//             for (const bmpPath of extractedBmpPaths) {
//               if (fs.existsSync(bmpPath)) await fs.promises.unlink(bmpPath);
//             }
//           }

//           // Evaluate context blocks matching relevant structural keys
//           if (pageContent.includes("Item Number:") || pageContent.includes("Item Name:")) {
//             console.log(`Routing clean structural text block for Page ${pageNumber} over to Gemini API...`);

//             const cleanProductData = await structureOcrText(pageContent);

//             const databasePayload = {
//               project_name: cleanProductData.project_name || null,
//               scheme: cleanProductData.scheme || null,
//               inn_code: cleanProductData.inn_code || null,
//               renovation_id: cleanProductData.renovation_id || null,
//               issue_date: cleanProductData.issue_date || null,
//               revisions: cleanProductData.revisions || null,
//               item_number: cleanProductData.item_number || null,
//               item_name: cleanProductData.item_name || null,
//               description: cleanProductData.description || null,
//               product_name: cleanProductData.product_name || null,
//               product_number: cleanProductData.product_number || null,
//               color_finish: cleanProductData.color_finish || null,
//               dimensions: cleanProductData.dimensions || null,
//               notes: cleanProductData.notes || null,
//               product_images: supabaseImagePayload
//             };

//             const { data, error } = await supabase.from('project_items').insert([databasePayload]).select();
//             if (error) throw error;
//             if (data && data[0]) processedRecords.push(data[0]);
//           } else {
//             console.log(`Skipping metadata sheet/instruction page context block on Page ${pageNumber}.`);
//           }

//           pageNumber++;
//         }
//       }
//     }

//     return res.status(200).json({
//       success: true,
//       message: `Successfully processed batch pages into ${processedRecords.length} records.`,
//       data: processedRecords
//     });

//   } catch (error) {
//     console.error("Batch engine processing execution exception loop:", error);
//     return res.status(500).json({ success: false, error: error.message });
//   } finally {
//     // Main File Storage Garbage Collection Cleanup
//     for (const filePath of pathsToCleanup) {
//       if (fs.existsSync(filePath)) {
//         try {
//           await fs.promises.unlink(filePath);
//           console.log(`Cleaned host upload tracking file cache: ${filePath}`);
//         } catch (cleanupError) {
//           console.error("Cleanup path removal target skipped:", cleanupError);
//         }
//       }
//     }
//   }
// });

// // Fetch Endpoint: GET http://localhost:3000/api/gemini-ocr/items
// router.get('/items', async (req, res) => {
//   try {
//     const { data, error } = await supabase
//       .from('project_items')
//       .select('*')
//       .order('created_at', { ascending: false });

//     if (error) return res.status(500).json({ success: false, error: error.message });
//     return res.status(200).json({ success: true, data: data });
//   } catch (error) {
//     return res.status(500).json({ success: false, error: error.message });
//   }
// });

// export default router;


import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import ws from 'ws';
import axios from 'axios';
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf"; 
import { createClient } from '@supabase/supabase-js';
import { structureOcrText } from '../ProductService/geminiOcrService.js';
import { extractPageImagesOnly } from '../documentOcrService/pdfImageDetector.js'; 

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
  global: { fetch: globalThis.fetch },
  realtime: { transport: ws }
});

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/process-spec', upload.array('files'), async (req, res) => {
  const processedRecords = [];
  const pathsToCleanup = [];

  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: 'Missing uploaded documents payload batch.' });
    }

    for (const file of req.files) {
      const originalExt = path.extname(file.originalname).toLowerCase();
      const fixedFilePath = `${file.path}${originalExt}`;
      
      await fs.promises.rename(file.path, fixedFilePath);
      pathsToCleanup.push(fixedFilePath);
      
      const absoluteFilePath = path.resolve(fixedFilePath);
      const isImage = ['.png', '.jpg', '.jpeg', '.bmp', '.webp'].includes(originalExt);

      // ────────────────────────────────────────────────────────
      // 📸 MODE A: DIRECT IMAGE UPLOAD ROUTE
      // ────────────────────────────────────────────────────────
      if (isImage) {
        console.log(`📸 Image Upload Processing...`);
        
        const imageBuffer = await fs.promises.readFile(absoluteFilePath);
        
        // Create unique timestamped name for direct standalone image uploads
        const storageFileName = `direct_${Date.now()}${originalExt}`;
        
        // 1. Upload to Supabase Storage Bucket
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('product-spec-images')
          .upload(storageFileName, imageBuffer, {
            contentType: `image/${originalExt.replace('.', '')}`,
            upsert: true
          });

        if (uploadError) throw uploadError;

        // 2. Fetch the Public URL
        const { data: urlData } = supabase.storage
          .from('product-spec-images')
          .getPublicUrl(storageFileName);

        const supabaseImagePayload = [urlData.publicUrl];

        const pythonResponse = await axios.post('http://127.0.0.1:8001/ocr', {
          image_path: absoluteFilePath
        });

        const rawTextFromPaddle = pythonResponse.data.text;
        if (!rawTextFromPaddle || rawTextFromPaddle.trim().length === 0) continue;

        if (rawTextFromPaddle.includes("Item Number:") || rawTextFromPaddle.includes("Item Name:")) {
          const cleanProductData = await structureOcrText(rawTextFromPaddle);

          const databasePayload = {
            project_name: cleanProductData.project_name || null,
            scheme: cleanProductData.scheme || null,
            inn_code: cleanProductData.inn_code || null,
            renovation_id: cleanProductData.renovation_id || null,
            issue_date: cleanProductData.issue_date || null,
            revisions: cleanProductData.revisions || null,
            item_number: cleanProductData.item_number || null,
            item_name: cleanProductData.item_name || null,
            description: cleanProductData.description || null,
            product_name: cleanProductData.product_name || null,
            product_number: cleanProductData.product_number || null,
            color_finish: cleanProductData.color_finish || null,
            dimensions: cleanProductData.dimensions || null,
            notes: cleanProductData.notes || null,
            product_images: supabaseImagePayload // Now holds ["https://..."]
          };

          const { data, error } = await supabase.from('project_items').insert([databasePayload]).select();
          if (error) throw error;
          if (data && data[0]) processedRecords.push(data[0]);
        }

      // ────────────────────────────────────────────────────────
      // ⚡ MODE B: HYBRID PDF UPLOAD ROUTE
      // ────────────────────────────────────────────────────────
      } else if (originalExt === '.pdf') {
        console.log(`⚡ PDF Processing...`);
        const loader = new PDFLoader(absoluteFilePath);
        const docs = await loader.load();

        let pageNumber = 1;
        for (const doc of docs) {
          let pageContent = doc.pageContent || "";
          let supabaseImagePayload = [];

          // Extract isolated images from the current page canvas
          const extractedBmpPaths = await extractPageImagesOnly(absoluteFilePath, pageNumber);
          
          if (extractedBmpPaths && extractedBmpPaths.length > 0) {
            console.log(`Page ${pageNumber}: Found ${extractedBmpPaths.length} image objects.`);
            
            // Loop through all images discovered on this specific page
            for (let i = 0; i < extractedBmpPaths.length; i++) {
              const targetBmp = extractedBmpPaths[i];
              
              if (fs.existsSync(targetBmp)) {
                const imageBuffer = await fs.promises.readFile(targetBmp);
                
                // 🛠️ Dynamic structured name formatting: e.g., page1_01.bmp, page1_02.bmp
                const imageIndexStr = String(i + 1).padStart(2, '0');
                const storageFileName = `page${pageNumber}_${imageIndexStr}_${Date.now()}.bmp`;

                // Upload item slice directly to public bucket
                const { error: uploadError } = await supabase.storage
                  .from('product-spec-images')
                  .upload(storageFileName, imageBuffer, {
                    contentType: 'image/bmp',
                    upsert: true
                  });

                if (!uploadError) {
                  const { data: urlData } = supabase.storage
                    .from('product-spec-images')
                    .getPublicUrl(storageFileName);
                  
                  supabaseImagePayload.push(urlData.publicUrl);
                } else {
                  console.error("Storage upload failed:", uploadError);
                }
                
                // Immediately delete temp .bmp file from local system disk
                await fs.promises.unlink(targetBmp);
              }
            }
          }

          if (pageContent.includes("Item Number:") || pageContent.includes("Item Name:")) {
            const cleanProductData = await structureOcrText(pageContent);

            const databasePayload = {
              project_name: cleanProductData.project_name || null,
              scheme: cleanProductData.scheme || null,
              inn_code: cleanProductData.inn_code || null,
              renovation_id: cleanProductData.renovation_id || null,
              issue_date: cleanProductData.issue_date || null,
              revisions: cleanProductData.revisions || null,
              item_number: cleanProductData.item_number || null,
              item_name: cleanProductData.item_name || null,
              description: cleanProductData.description || null,
              product_name: cleanProductData.product_name || null,
              product_number: cleanProductData.product_number || null,
              color_finish: cleanProductData.color_finish || null,
              dimensions: cleanProductData.dimensions || null,
              notes: cleanProductData.notes || null,
              product_images: supabaseImagePayload // Clean public URL arrays saved to database row
            };

            const { data, error } = await supabase.from('project_items').insert([databasePayload]).select();
            if (error) throw error;
            if (data && data[0]) processedRecords.push(data[0]);
          }
          pageNumber++;
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: `Successfully structured batch pages into ${processedRecords.length} records.`,
      data: processedRecords
    });

  } catch (error) {
    console.error("Batch processing error:", error);
    return res.status(500).json({ success: false, error: error.message });
  } finally {
    for (const filePath of pathsToCleanup) {
      if (fs.existsSync(filePath)) {
        try { await fs.promises.unlink(filePath); } catch (e) {}
      }
    }
  }
});

// Fetch Endpoint: GET http://localhost:3000/api/gemini-ocr/items
router.get('/items', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('project_items')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ success: false, error: error.message });
    return res.status(200).json({ success: true, data: data });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;