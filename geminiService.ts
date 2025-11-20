import { GoogleGenAI } from "@google/genai";
import { Bill } from "../types";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

export const analyzeBills = async (bills: Bill[], query: string): Promise<string> => {
  const client = getClient();
  if (!client) return "API Key is missing. Cannot analyze bills.";

  // Prepare context
  const billsContext = bills.map(b => 
    `- ${b.title} (${b.category}): $${b.amount} | Status: ${b.status} | Date: ${new Date(b.createdAt).toLocaleDateString()}`
  ).join('\n');

  const prompt = `
    You are a financial assistant for a team. Here is a list of recent bills:
    ${billsContext}

    User Query: ${query}

    Provide a helpful, concise summary or answer based on the data provided. 
    If asking for insights, look for spending patterns.
  `;

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "I couldn't generate a response.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Sorry, I encountered an error analyzing the data.";
  }
};

export const suggestCategory = async (description: string): Promise<string> => {
    const client = getClient();
    if (!client) return "";
  
    try {
      const response = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Given the bill description: "${description}", suggest the best category from this list: Petrol, Food, Travel, Maintenance, Office, Other. Return ONLY the category name.`,
      });
      return response.text?.trim() || "Other";
    } catch (e) {
        return "Other";
    }
};
