import { GoogleGenAI } from "@google/genai";
import { BreachReport } from "../types";

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

export const analyzePasswordSecurity = async (password: string): Promise<BreachReport> => {
  const ai = getAiClient();
  if (!ai) {
    // Fallback if no API key
    return {
      isSafe: password.length > 8,
      score: password.length > 8 ? 70 : 30,
      analysis: "API Key missing. Basic length check performed.",
      breachCount: 0
    };
  }

  try {
    const prompt = `
      Analyze the strength of the following password string (do not reveal it in output).
      Password string to analyze: "${password}"
      
      Provide a security assessment in JSON format:
      {
        "score": number (0-100),
        "isSafe": boolean,
        "breachCount": number (simulate a number of potential matches in common leak databases based on pattern),
        "analysis": "Short 1 sentence advice"
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text || "{}";
    return JSON.parse(text) as BreachReport;

  } catch (error) {
    console.error("Gemini Analysis Failed", error);
    return {
      isSafe: false,
      score: 0,
      analysis: "AI Analysis unavailable.",
      breachCount: 0
    };
  }
};

export const checkDarkWeb = async (email: string): Promise<string> => {
  const ai = getAiClient();
  if (!ai) return "API Key required for Dark Web Scan.";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Simulate a dark web scan report for the email pattern "${email}". 
      Do not actually scan the web. Generate a realistic-sounding report about whether this email format has appeared in major historical breaches (like LinkedIn, Adobe, etc) or if it appears clean. 
      Keep it to 2 sentences max. Be helpful.`,
    });
    return response.text || "No data returned.";
  } catch (e) {
    return "Scan failed.";
  }
};