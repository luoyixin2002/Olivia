
import { Injectable } from '@angular/core';
import { GoogleGenAI, GenerateContentResponse, Chat } from '@google/genai';

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env['API_KEY'] });
  }

  async generateInspiration(questionText: string): Promise<string> {
    const prompt = `
      The user is trying to answer this question about their year 2025: "${questionText}".
      They are stuck and need inspiration. 
      
      Please provide 2 short, distinct, and concrete *examples* of how someone might answer this question.
      
      Rules:
      1. Tone: Warm, reflective, "Morandi" style (calm and observant).
      2. Format: Just list the two examples. 
      3. Length: Keep examples concise (under 30 words each).
      4. Language: Provide the examples in Chinese (as the main user language is Chinese).
      
      Example Output format:
      Example 1: ...
      Example 2: ...
    `;

    const response = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text.trim();
  }

  async generateYearReview(answers: Record<string, string>, colorContext: string): Promise<GenerateContentResponse> {
    const prompt = `
      You are a deeply insightful humanities writer and psychoanalyst. You are acting as the user's "Old Friend" who knows their soul.
      The user has answered 20 questions about their year 2025. 
      
      **CRITICAL CONTEXT - EMOTIONAL TONE**:
      The user has defined their year's color as: "${colorContext}".
      You MUST adjust the writing style and emotional temperature of the letter to match this color.
      - If it's Warm (Orange/Red): Be embracing, passionate, mentioning warmth, fire, sunset.
      - If it's Cool (Blue/Cyan): Be calm, deep, intellectual, mentioning sea, night, clarity.
      - If it's Green: Be healing, growing, mentioning plants, breath, rain.
      - If it's Gray: Be stoic, minimalist, rational, quiet.
      
      Here are the user's answers:
      ${JSON.stringify(answers, null, 2)}

      STRICT RULES FOR CONTENT:
      1. **OPENING**: The letter MUST start exactly with these words: "亲爱的，见信如晤。"
      2. **CLOSING**: The letter MUST end exactly with these words: "在 2026 的入口处，请带上这份勇气。"
      3. **FORBIDDEN WORDS**: You are STRICTLY FORBIDDEN from using the words "希望" (hope), "快乐" (happy), "成功" (success), "加油" (jiayou). These are too generic. Instead use words like "安宁" (peace), "赤诚" (sincerity), "抵达" (arrival), "舒展" (unfold), "自洽" (self-consistent).
      4. **LENGTH**: The letter MUST be around 400 Chinese characters. Concise, profound, and impactful.
      5. **BE SPECIFIC**: Quote specific details from their answers (the object, the smell, the anxiety). Connect these dots.
      6. **FIND TENSION**: Analyze the conflict between their "Regrets" and "Achievements".
      7. **KEYWORDS**: Extract 3 distinct 2-character or 4-character Chinese keywords.

      Please generate a response in valid JSON format with the following structure:
      {
        "keywords": [
          { "word": "Keyword1 (Chinese)", "explanation": " poetic explanation..." },
          { "word": "Keyword2 (Chinese)", "explanation": " poetic explanation..." },
          { "word": "Keyword3 (Chinese)", "explanation": " poetic explanation..." }
        ],
        "portrait": {
          "mentalCore": "Description of their spiritual/mental state...",
          "actionPattern": "Analysis of their behavior and actions...",
          "emotionalTone": "The overall emotional color of their year..."
        },
        "letterTitle": "A Creative, Non-Generic Title (Chinese)",
        "letterBody": "A ~400 word letter in Chinese. Narrative prose. Structure it like a real letter. Don't use bullet points. Make it flow like water."
      }
      
      Do not include markdown formatting like \`\`\`json. Just return the raw JSON string.
    `;

    return this.ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });
  }

  async chatWithYear(history: {role: string, parts: string}[], message: string): Promise<string> {
    const chat: Chat = this.ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: "You are the personification of the user's 2025 memory. You are wise, calm, and intimate. You speak in a warm, Morandi-toned voice. You know everything they experienced this year based on context.",
      },
      history: history.map(h => ({
        role: h.role,
        parts: [{ text: h.parts }]
      }))
    });

    const result = await chat.sendMessage({ message });
    return result.text;
  }
}
