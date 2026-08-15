import { GoogleGenAI, Type } from '@google/genai';
import pdf from 'pdf-parse/lib/pdf-parse.js';

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Parses raw PDF buffer and uses Gemini to extract candidate details
 */
export async function processResumeAndCreateProfile(pdfBuffer) {
  // 1. Extract raw text from PDF
  const pdfData = await pdf(pdfBuffer);
  const rawResumeText = pdfData.text;

  // 2. Extract structured profile using Gemini
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Extract candidate profile details from this resume text:\n\n${rawResumeText}`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          candidateName: { type: Type.STRING },
          primarySkills: { type: Type.ARRAY, items: { type: Type.STRING } },
          experienceYears: { type: Type.NUMBER },
          keyProjects: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                technologies: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            }
          }
        },
        required: ['candidateName', 'primarySkills']
      }
    }
  });

  const parsedProfile = JSON.parse(response.text);

  return {
    profile: parsedProfile,
    rawText: rawResumeText
  };
}

/**
 * Builds system prompt for the Gemini Interviewer session
 */
export function buildInterviewerPrompt(candidateProfile) {
  return `
    You are an expert Technical Interviewer for Prep2Pass.
    Candidate Name: ${candidateProfile.candidateName || 'Candidate'}
    Primary Skills: ${candidateProfile.primarySkills ? candidateProfile.primarySkills.join(', ') : 'Software Development'}

    Instructions:
    1. Ask clear, scenario-based technical questions matching the candidate's skills.
    2. Keep spoken responses concise (2 sentences max).
    3. Start with Round 1: Core Fundamentals.
  `;
}