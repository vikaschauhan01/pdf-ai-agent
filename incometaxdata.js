import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import dotenv from 'dotenv';
import ws from 'ws';
import { createRequire } from 'module';

dotenv.config();

// Fix the CommonJS import boundary cleanly
const require = createRequire(import.meta.url);
const rawPdfParser = require('pdf-parse');

// 💡 EXPLICITLY UNPACK THE FUNCTION HERE
const pdfParser = rawPdfParser.default || rawPdfParser;

// Initialize the Supabase client safely for Node environment configurations
const supabase = createClient(
  process.env.SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false },
    realtime: { transport: ws }
  }
);

// Initialize the Google Generative AI client using the classic package version structure
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function processAndStoreTaxPDF() {
  try {
    console.log("Reading Income-tax-Act-2025_2026.pdf...");
    const dataBuffer = fs.readFileSync('./Income-tax-Act-2025_2026.pdf');
    
    // Now pdfParser is guaranteed to be a callable function
    const parsedPdf = await pdfParser(dataBuffer);
    
    // Slicing strategy: Split text using section boundaries like Clause numbers
    const rawChunks = parsedPdf.text.split(/\n\((\d+)\)\s+/g); 
    
    console.log(`Extracted text blocks. Beginning database upload loop...`);

    // Get the specific model reference instance out of the loop for efficiency
    const embeddingModel = ai.getGenerativeModel({ model: "text-embedding-004" });

    for (let i = 1; i < rawChunks.length; i += 2) {
      const numericReference = rawChunks[i];
      const sectionText = rawChunks[i + 1]?.trim();

      if (!sectionText) continue;

      const fullContentString = `Clause (${numericReference}): ${sectionText}`;

      // Corrected call format for the classic @google/generative-ai dependency package 
      const embeddingResponse = await embeddingModel.embedContent(fullContentString);
      const vectorValues = embeddingResponse.embedding.values;

      // Store rows into your targeted Supabase table cells
      const { error } = await supabase
        .from('ca_knowledge_base')
        .insert({
          domain: 'direct_tax',
          act_name: 'Income-tax Act, 2025',
          section_reference: `Clause (${numericReference})`,
          tax_year: '2026-27',
          content: fullContentString,
          embedding: vectorValues
        });

      if (error) {
        console.error(`❌ Store failed for Clause (${numericReference}):`, error.message);
      } else {
        console.log(`✅ Successfully stored Clause (${numericReference}) into database.`);
      }
    }
    console.log("🚀 Storage strategy executed flawlessly!");
  } catch (error) {
    console.error("🔴 Fatal Storage Pipeline Error:", error);
  }
}

processAndStoreTaxPDF();