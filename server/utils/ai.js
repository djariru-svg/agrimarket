import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function chat(message, sessionId) {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
    return 'Hello! I am your AgriMarket RW assistant. Please add a valid Gemini API key to enable AI responses.';
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `You are AgriMarket RW AI assistant for Rwanda farmers and buyers. Respond in a helpful, concise way. User asks: ${message}`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Gemini error:', error);
    return 'I am having trouble reaching the AI service right now. Please try again in a moment.';
  }
}

export function getConversationHistory() {
  return [];
}
