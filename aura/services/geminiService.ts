
import { GoogleGenAI } from "@google/genai";

export class GeminiService {
  private ai: any;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  async getSkincareAdvice(concern: string) {
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `I have a skin concern: ${concern}. Provide a short, natural remedy or routine using organic ingredients. Keep it under 100 words and focus on holistic wellness.`,
        config: {
          systemInstruction: "You are an expert holistic aesthetician specializing in organic ingredients and ancient beauty rituals. You prioritize safety and natural solutions.",
          temperature: 0.7,
        },
      });
      return response.text;
    } catch (error) {
      console.error("Gemini Error:", error);
      return "I'm having trouble connecting to my botanical database. Please try again in a moment.";
    }
  }

  async generateCustomContent(prompt: string, systemInstruction?: string) {
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          systemInstruction: systemInstruction || "You are a helpful AI assistant.",
          temperature: 0.2, // lower temperature for strict format/parsing consistency
        },
      });
      return response.text;
    } catch (error) {
      console.error("Gemini custom content error:", error);
      throw error;
    }
  }
}

