
import { GoogleGenAI } from "@google/genai";
import { Problem } from '../types';
import { marked } from 'marked';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export const getExplanation = async (problem: Problem): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            parts: [{ text: problem.explanationPrompt }],
          },
        ],
        config: {
          systemInstruction: 'You are a friendly and encouraging math tutor. Your explanations should be clear, concise, and easy for a student to understand. Use markdown for formatting.',
          temperature: 0.5,
        }
    });
    
    const markdownText = response.text;
    const html = await marked.parse(markdownText);
    return html;
  } catch (error) {
    console.error("Error generating explanation from Gemini:", error);
    // Provide a fallback explanation in case of API error
    return `<p>We couldn't generate an explanation right now. The correct answer is <strong>${problem.correctAnswer}</strong>.</p>`;
  }
};
