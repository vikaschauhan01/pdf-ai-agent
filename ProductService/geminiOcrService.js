
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize using the older SDK syntax
const ai = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = ai.getGenerativeModel({ 
  model: "gemini-2.5-flash"
});

/**
 * Parses raw messy OCR text into a structured flat database schema object via Gemini.
 * @param {string} paddleOcrText - The string block returned by PaddleOCR.
 * @returns {Promise<Object>} The flat database-ready JSON record object.
 */
export async function structureOcrText(paddleOcrText) {
  // 1. Log the incoming data from PaddleOCR to make sure it's not empty
  console.log("================ [GEMINI SERVICE: INPUT] ================");
  console.log("Raw text characters received from PaddleOCR:", paddleOcrText ? paddleOcrText.length : 0);
  console.log("Raw Text Snippet:\n", paddleOcrText ? paddleOcrText.substring(0, 500) + "..." : "EMPTY INPUT");
  console.log("========================================================");

  try {
    const prompt = `
      Analyze the following raw text block parsed from a product specification sheet. 
      Clean and extract all parameters into a single flat JSON object matching this schema layout:
      
      {
        "project_name": "string",
        "scheme": "string",
        "inn_code": "string",
        "renovation_id": "string",
        "issue_date": "string",
        "revisions": "string",
        "item_number": "string",
        "item_name": "string",
        "description": "string",
        "product_name": "string",
        "product_number": "string",
        "color_finish": "string",
        "dimensions": "string",
        "notes": "string"
      }
      
      STRICT WRAPPING RULES:
      1. "dimensions" must be output as a single continuous text string exactly as it reads. Do not convert to an array.
      2. "notes" must be a single continuous text block. Merge all loose structural notes sentences together into a standard paragraph string.
      
      Raw Data Text:
      ${paddleOcrText}
    `;

    console.log("Sending payload request to Gemini API...");
    
    // Request JSON output specifically from the model
    const response = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json"
      }
    });

    const rawResponseText = response.response.text();

    // 2. Log the raw text string returned by the Gemini API before parsing it
    console.log("=============== [GEMINI SERVICE: RAW OUPUT] ===============");
    console.log(rawResponseText);
    console.log("===========================================================");

    const parsedJson = JSON.parse(rawResponseText);

    // 3. Log the final successfully parsed JSON object
    console.log("✅ [GEMINI SERVICE: SUCCESS] Successfully parsed text into JSON structure.");
    console.log("Parsed Item Number:", parsedJson.item_number || "N/A");
    console.log("Parsed Item Name:", parsedJson.item_name || "N/A");
    
    return parsedJson;

  } catch (error) {
    // 4. Detailed error log if parsing fails or Gemini rejects the prompt
    console.error("❌ ============= [GEMINI SERVICE: ERROR] =============");
    console.error("Gemini Parsing Service Execution Error:", error);
    console.error("======================================================");
    throw new Error("Failed to interpret layout definitions safely.");
  }
}