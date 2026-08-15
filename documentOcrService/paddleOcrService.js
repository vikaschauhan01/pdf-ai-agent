// paddleOcrService.js

// import axios from "axios";

// export async function extractTextWithPaddle(imagePath) {

//     const response = await axios.post(
//         "http://localhost:8001/ocr",
//         {
//             image_path: imagePath
//         }
//     );

//     return response.data;
// }


// export async function extractTextWithPaddle(imagePath) {

//     const response = await fetch(
//         "http://localhost:8001/ocr",
//         {
//             method: "POST",
//             headers: {
//                 "Content-Type": "application/json"
//             },
//             body: JSON.stringify({
//                 image_path: imagePath
//             })
//         }
//     );

//     return await response.json();
// }

import path from "path";

export async function extractTextWithPaddle(imagePath) {

    const absolutePath = path.resolve(imagePath);

    const response = await fetch(
        "http://localhost:8001/ocr",
        {
            method:"POST",
            headers:{
                "Content-Type":"application/json"
            },
            body:JSON.stringify({
                image_path:absolutePath
            })
        }
    );

    return await response.json();
}