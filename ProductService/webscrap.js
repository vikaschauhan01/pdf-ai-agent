
//this for google sheet 


// import 'dotenv/config';
// import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
// import { google } from 'googleapis';
// import axios from 'axios';
// import * as cheerio from 'cheerio';

// const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY);
// const SPREADSHEET_ID = '1KSnemPRAX5ocKjMcCN9jTe8qh98mXomB845jtRMUSiA';

// const auth = new google.auth.GoogleAuth({
//   keyFile: 'credentials.json',
//   scopes: ['https://www.googleapis.com/auth/spreadsheets']
// });

// const sheets = google.sheets({ version: 'v4', auth });

// const productListSchema = {
//   type: SchemaType.ARRAY,
//   description: "List of products extracted from the webpage",
//   items: {
//     type: SchemaType.OBJECT,
//     properties: {
//       title: { type: SchemaType.STRING },
//       brand: { type: SchemaType.STRING },
//       price: { type: SchemaType.NUMBER },
//       rating: { type: SchemaType.NUMBER },
//       reviewCount: { type: SchemaType.INTEGER },
//       availability: { type: SchemaType.STRING },
//       asin: { type: SchemaType.STRING }
//     },
//     required: ["title"]
//   }
// };

// async function generateContentWithRetry(cleanedText, retries = 3, delayMs = 2000) {
//   const model = genAI.getGenerativeModel({
//     model: "gemini-2.5-flash",
//     generationConfig: {
//       responseMimeType: "application/json",
//       responseSchema: productListSchema,
//     },
//   });

//   const prompt = `Extract all individual products from this list. Extract every single product item into the JSON array:\n\n${cleanedText}`;

//   for (let attempt = 1; attempt <= retries; attempt++) {
//     try {
//       return await model.generateContent(prompt);
//     } catch (error) {
//       if (error.message?.includes('503') && attempt < retries) {
//         console.warn(`⚠️ gemini-2.5-flash overloaded (503). Retrying attempt ${attempt}/${retries} in ${delayMs / 1000}s...`);
//         await new Promise(resolve => setTimeout(resolve, delayMs));
//         delayMs *= 2;
//       } else {
//         throw error;
//       }
//     }
//   }
// }

// export async function processScrapeRequest(url) {
//   // 1. Fetch raw HTML
//   const { data: rawHtml } = await axios.get(url, {
//     headers: { 
//       'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
//       'Accept-Language': 'en-US,en;q=0.9'
//     }
//   });

//   // 2. Clean and target specific product blocks
//   const $ = cheerio.load(rawHtml);
  
//   // Strip out unwanted non-content elements
//   $('script, style, svg, noscript, header, footer, iframe, nav').remove();

//   let extractedSnippets = [];

//   // Check if page contains Amazon search result cards
//   const amazonCards = $('[data-component-type="s-search-result"]');

//   if (amazonCards.length > 0) {
//     // Collect text card by card to avoid boilerplate fluff
//     amazonCards.each((i, el) => {
//       const asin = $(el).attr('data-asin') || '';
//       const text = $(el).text().replace(/\s+/g, ' ').trim();
//       if (text.length > 10) {
//         extractedSnippets.push(`[ASIN: ${asin}] ${text}`);
//       }
//     });
//   } else {
//     // Generic fallback for non-Amazon listing sites
//     const text = $('body').text().replace(/\s+/g, ' ').trim();
//     extractedSnippets.push(text.substring(0, 100000));
//   }

//   const cleanedText = extractedSnippets.join('\n---\n').substring(0, 120000);

//   // 3. Extract products via Gemini 2.5 Flash
//   const result = await generateContentWithRetry(cleanedText);
//   const products = JSON.parse(result.response.text());

//   if (!Array.isArray(products) || products.length === 0) {
//     throw new Error("No products could be extracted from this URL.");
//   }

//   // 4. Get sheet tab name dynamically
//   const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
//   const firstTabName = meta.data.sheets[0].properties.title;

//   // 5. Map products into rows
//   const newRows = products.map(p => [
//     url,
//     p.title || '',
//     p.brand || '',
//     p.price || 0,
//     p.rating || 0,
//     p.reviewCount || 0,
//     p.availability || '',
//     p.asin || ''
//   ]);

//   // 6. Append to Google Sheets
//   await sheets.spreadsheets.values.append({
//     spreadsheetId: SPREADSHEET_ID,
//    range: 'Sheet1!A:H',
//     valueInputOption: 'USER_ENTERED',
//     requestBody: {
//       values: newRows
//     }
//   });

//   return { title: `Extracted ${products.length} products`, totalCount: products.length };
// }



import 'dotenv/config';
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { google } from 'googleapis';
import axios from 'axios';
import * as cheerio from 'cheerio';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const SPREADSHEET_ID = '1KSnemPRAX5ocKjMcCN9jTe8qh98mXomB845jtRMUSiA';

const auth = new google.auth.GoogleAuth({
  keyFile: 'credentials.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

const sheets = google.sheets({ version: 'v4', auth });

const productListSchema = {
  type: SchemaType.ARRAY,
  description: "List of products extracted from the webpage",
  items: {
    type: SchemaType.OBJECT,
    properties: {
      title: { type: SchemaType.STRING },
      brand: { type: SchemaType.STRING },
      price: { type: SchemaType.NUMBER },
      rating: { type: SchemaType.NUMBER },
      reviewCount: { type: SchemaType.INTEGER },
      availability: { type: SchemaType.STRING },
      asin: { type: SchemaType.STRING }
    },
    required: ["title"]
  }
};

async function generateContentWithRetry(cleanedText, retries = 3, delayMs = 2000) {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: productListSchema,
    },
  });

  const prompt = `Extract all individual products from this list. Extract every single product item into the JSON array:\n\n${cleanedText}`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await model.generateContent(prompt);
    } catch (error) {
      if (error.message?.includes('503') && attempt < retries) {
        console.warn(`⚠️ gemini-2.5-flash overloaded (503). Retrying attempt ${attempt}/${retries} in ${delayMs / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        delayMs *= 2;
      } else {
        throw error;
      }
    }
  }
}

// Helper to extract product blocks & find "Next" link from raw HTML
function parsePageContent(rawHtml, currentUrl) {
  const $ = cheerio.load(rawHtml);
  $('script, style, svg, noscript, header, footer, iframe, nav').remove();

  let extractedSnippets = [];
  const amazonCards = $('[data-component-type="s-search-result"]');

  if (amazonCards.length > 0) {
    amazonCards.each((i, el) => {
      const asin = $(el).attr('data-asin') || '';
      const text = $(el).text().replace(/\s+/g, ' ').trim();
      if (text.length > 10) {
        extractedSnippets.push(`[ASIN: ${asin}] ${text}`);
      }
    });
  } else {
    // Generic product card selector (works for Books to Scrape & standard sites)
    const genericCards = $('.product_pod, .product-item, .card, article');
    if (genericCards.length > 0) {
      genericCards.each((i, el) => {
        extractedSnippets.push($(el).text().replace(/\s+/g, ' ').trim());
      });
    } else {
      const text = $('body').text().replace(/\s+/g, ' ').trim();
      extractedSnippets.push(text.substring(0, 100000));
    }
  }

  // 🔍 Find "Next Page" Link dynamically
  let nextUrl = null;
  const nextAnchor = $('a.s-pagination-next, li.next a, a:contains("Next"), a:contains("next")').first();
  if (nextAnchor.length > 0) {
    const href = nextAnchor.attr('href');
    if (href) {
      nextUrl = new URL(href, currentUrl).href; // Converts relative URL to absolute URL
    }
  }

  return {
    cleanedText: extractedSnippets.join('\n---\n').substring(0, 120000),
    nextUrl
  };
}

export async function processScrapeRequest(startUrl, maxPages = 3) {
  let currentUrl = startUrl;
  let allProducts = [];
  let pageCount = 0;

  // 1. Loop through pages (up to maxPages limit)
  while (currentUrl && pageCount < maxPages) {
    pageCount++;
    console.log(`📄 Scraper visiting Page ${pageCount}: ${currentUrl}`);

    try {
      const { data: rawHtml } = await axios.get(currentUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      });

      const { cleanedText, nextUrl } = parsePageContent(rawHtml, currentUrl);

      // Extract products from current page using Gemini
      const result = await generateContentWithRetry(cleanedText);
      const pageProducts = JSON.parse(result.response.text());

      if (Array.isArray(pageProducts)) {
        // Tag products with the URL of the page they came from
        const tagged = pageProducts.map(p => ({ ...p, sourceUrl: currentUrl }));
        allProducts.push(...tagged);
      }

      // Move to next page URL or exit loop if no next page exists
      currentUrl = nextUrl;
    } catch (err) {
      console.error(`❌ Failed to scrape ${currentUrl}:`, err.message);
      break;
    }
  }

  if (allProducts.length === 0) {
    throw new Error("No products could be extracted from this URL or its pagination links.");
  }

  // 2. Get sheet tab name dynamically
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const firstTabName = meta.data.sheets[0].properties.title;

  // 3. Map all collected products into spreadsheet rows
  const newRows = allProducts.map(p => [
    p.sourceUrl || startUrl,
    p.title || '',
    p.brand || '',
    p.price || 0,
    p.rating || 0,
    p.reviewCount || 0,
    p.availability || '',
    p.asin || ''
  ]);

  // 4. Batch append all rows across all scraped pages
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Sheet1!A:H',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: newRows
    }
  });

  return { 
    title: `Extracted ${allProducts.length} products across ${pageCount} page(s)`, 
    totalCount: allProducts.length,
    pagesScraped: pageCount
  };
}