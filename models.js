// import dotenv from "dotenv";
// dotenv.config();

// const response = await fetch(
//   `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GOOGLE_API_KEY}`
// );

// const data = await response.json();

// for (const model of data.models) {
//   console.log(model.name);
// }


import dotenv from "dotenv";
dotenv.config();

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash-lite",
});

const result = await model.generateContent("Hello");

console.log(result.response.text());