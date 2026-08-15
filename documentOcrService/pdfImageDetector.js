// import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
// import fs from "fs";


// export async function hasImages(pdfPath, pageNumber) {

//     try {

//         if (!fs.existsSync(pdfPath)) {
//             throw new Error(
//                 `PDF not found: ${pdfPath}`
//             );
//         }


//         // Load PDF
//         const pdfBuffer = fs.readFileSync(pdfPath);


//         const pdf = await pdfjsLib.getDocument({
//             data: pdfBuffer
//         }).promise;



//         // Get specific page
//         const page = await pdf.getPage(pageNumber);



//         // Get page operators
//         const operatorList =
//             await page.getOperatorList();



//         // Image related operators
//         const imageOperators = [

//             pdfjsLib.OPS.paintImageXObject,

//             pdfjsLib.OPS.paintJpegXObject,

//             pdfjsLib.OPS.paintInlineImageXObject

//         ];



//         // Check image operators
//         const hasImage =
//             operatorList.fnArray.some(
//                 operator =>
//                     imageOperators.includes(operator)
//             );



//         return hasImage;



//     }
//     catch(error){

//         console.error(
//             `Image detection failed for page ${pageNumber}:`,
//             error.message
//         );


//         return false;

//     }

// }


import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import fs from "fs";
import path from "path";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));


export async function hasImages(pdfPath, pageNumber) {

    try {

        const buffer = fs.readFileSync(pdfPath);


        // Convert Buffer -> Uint8Array
        const data = new Uint8Array(buffer);


        const pdf = await pdfjsLib.getDocument({
            data
        }).promise;



        const page = await pdf.getPage(pageNumber);



        const operatorList =
            await page.getOperatorList();



        const imageOperators = [

            pdfjsLib.OPS.paintImageXObject,

            pdfjsLib.OPS.paintJpegXObject,

            pdfjsLib.OPS.paintInlineImageXObject

        ];



        const hasImage =
            operatorList.fnArray.some(
                fn => imageOperators.includes(fn)
            );


        return hasImage;


    }
    catch(error){

        console.error(
            `Image detection failed for page ${pageNumber}:`,
            error.message
        );

        return false;
    }

}


function encodeBMP(rgbaData, width, height) {
    const extraBytes = (width * 3) % 4;
    const paddingSize = extraBytes === 0 ? 0 : 4 - extraBytes;
    const rowSize = width * 3 + paddingSize;
    const pixelDataSize = rowSize * height;
    
    const fileHeaderSize = 14;
    const infoHeaderSize = 40;
    const fileSize = fileHeaderSize + infoHeaderSize + pixelDataSize;
    
    const buffer = Buffer.alloc(fileSize);
    
    // --- BMP File Header ---
    buffer.write("BM", 0);                 // Magic Number
    buffer.writeUInt32LE(fileSize, 2);     // File Size
    buffer.writeUInt32LE(0, 6);            // Reserved
    buffer.writeUInt32LE(fileHeaderSize + infoHeaderSize, 10); // Data Offset
    
    // --- BMP Info Header (BITMAPINFOHEADER) ---
    buffer.writeUInt32LE(infoHeaderSize, 14); // Header Size
    buffer.writeInt32LE(width, 18);          // Width
    buffer.writeInt32LE(-height, 22);        // Height (Negative value forces top-down orientation)
    buffer.writeUInt16LE(1, 26);             // Planes
    buffer.writeUInt16LE(24, 28);            // Bits per Pixel (24-bit RGB)
    buffer.writeUInt32LE(0, 30);             // Compression (0 = None)
    buffer.writeUInt32LE(pixelDataSize, 34); // Image Data Size
    buffer.writeInt32LE(2835, 38);           // Horizontal Resolution
    buffer.writeInt32LE(2835, 42);           // Vertical Resolution
    buffer.writeUInt32LE(0, 46);             // Colors in Palette
    buffer.writeUInt32LE(0, 50);             // Important Colors
    
    // --- Pixel Data Layer (Convert RGBA -> BGR) ---
    let rowOffset = fileHeaderSize + infoHeaderSize;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const rgbaIndex = (y * width + x) * 4;
            const bufferIndex = rowOffset + (x * 3);
            
            // Extract individual color bytes from the array channel
            const r = rgbaData[rgbaIndex];
            const g = rgbaData[rgbaIndex + 1];
            const b = rgbaData[rgbaIndex + 2];
            
            // Write in BGR order required by BMP formatting layouts
            buffer[bufferIndex] = b;
            buffer[bufferIndex + 1] = g;
            buffer[bufferIndex + 2] = r;
        }
        rowOffset += rowSize;
    }
    
    return buffer;
}

export async function extractPageImagesOnly(pdfPath, pageNumber, outputDir = "./uploads") {
    try {
        const buffer = fs.readFileSync(pdfPath);
        const data = new Uint8Array(buffer);
        const pdf = await pdfjsLib.getDocument({ data }).promise;
        const page = await pdf.getPage(pageNumber);

        const operatorList = await page.getOperatorList();
        const imagePaths = [];

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        for (let i = 0; i < operatorList.fnArray.length; i++) {
            const fn = operatorList.fnArray[i];

            if (fn === pdfjsLib.OPS.paintImageXObject || fn === pdfjsLib.OPS.paintJpegXObject) {
                const args = operatorList.argsArray[i];
                const imageRef = args[0]; 

                let imageObj = null;
                let retries = 5;

                while (retries > 0) {
                    try {
                        imageObj = await page.objs.get(imageRef);
                        if (imageObj) break;
                    } catch (e) {}
                    await delay(100); 
                    retries--;
                }

                if (!imageObj) {
                    try { imageObj = await page.commonObjs.get(imageRef); } catch (e) {}
                }

                if (imageObj && imageObj.data && imageObj.width && imageObj.height) {
                    const width = imageObj.width;
                    const height = imageObj.height;
                    
                    // Notice we use the extension `.bmp` now!
                    const fileName = `page_${pageNumber}_img_${imageRef}.bmp`;
                    const absoluteImgPath = path.join(outputDir, fileName);

                    // Standardize color channels depending on PDF formatting rules (RGBA vs RGB)
                    let rawPixels = imageObj.data;
                    if (rawPixels.length === width * height * 3) {
                        // If it's pure 24-bit RGB data, expand it to a mock 32-bit array structure for our encoder loop
                        const expandedPixels = new Uint8ClampedArray(width * height * 4);
                        for (let j = 0, k = 0; j < rawPixels.length; j += 3, k += 4) {
                            expandedPixels[k] = rawPixels[j];
                            expandedPixels[k + 1] = rawPixels[j + 1];
                            expandedPixels[k + 2] = rawPixels[j + 2];
                        }
                        rawPixels = expandedPixels;
                    }

                    // Build and save the structurally correct image file structure
                    const bmpBuffer = encodeBMP(rawPixels, width, height);
                    fs.writeFileSync(absoluteImgPath, bmpBuffer);

                    imagePaths.push(absoluteImgPath);
                }
            }
        }
        return imagePaths; 
    } catch (error) {
        console.error(`Isolated image extraction failed on page ${pageNumber}:`, error.message);
        return [];
    }

}