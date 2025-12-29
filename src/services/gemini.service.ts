
import { Injectable } from '@angular/core';
import { GoogleGenAI, Type } from '@google/genai';

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private ai: GoogleGenAI;
  private readonly MODEL_ID = 'gemini-2.5-flash';

  constructor() {
    // Initialize the client with the API key from the environment
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async generateInspiration(questionText: string): Promise<string> {
    const prompt = `
      The user is answering: "${questionText}".
      Provide 2 short, distinct, concrete examples of how someone might answer.
      Tone: Warm, reflective, Morandi style, Chinese.
      Length: Under 30 words each.
      Format: Just the examples text, separated by a newline.
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: this.MODEL_ID,
        contents: prompt
      });
      return response.text || "灵感信号微弱，请听从内心的声音。";
    } catch (error) {
      console.error('Gemini API Error:', error);
      return "灵感信号微弱，请听从内心的声音。";
    }
  }

  async generateYearReview(answers: Record<string, string>, colorContext: string): Promise<{ text: string }> {
    const prompt = `
      You are a gentle psychoanalyst.
      User's Color: "${colorContext}".
      User's Answers: ${JSON.stringify(answers)}

      Output a JSON object with the following structure:
      {
        "keywords": [{ "word": "Chinese Word", "explanation": "Short logic" }],
        "portrait": { "mentalCore": "...", "actionPattern": "...", "emotionalTone": "..." },
        "letterTitle": "Poetic Title",
        "letterBody": "A warm letter (~300 chars). Start: '亲爱的，见信如晤。' End: '在 2026 的入口处，请带上这份勇气。'"
      }
    `;

    // Define strict schema for JSON output
    const schema = {
      type: Type.OBJECT,
      properties: {
        keywords: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              word: { type: Type.STRING },
              explanation: { type: Type.STRING }
            },
            required: ['word', 'explanation']
          }
        },
        portrait: {
          type: Type.OBJECT,
          properties: {
            mentalCore: { type: Type.STRING },
            actionPattern: { type: Type.STRING },
            emotionalTone: { type: Type.STRING }
          },
          required: ['mentalCore', 'actionPattern', 'emotionalTone']
        },
        letterTitle: { type: Type.STRING },
        letterBody: { type: Type.STRING }
      },
      required: ['keywords', 'portrait', 'letterTitle', 'letterBody']
    };

    try {
      const response = await this.ai.models.generateContent({
        model: this.MODEL_ID,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: schema,
          systemInstruction: "You are a poetic writer. Use warm, Morandi-style Chinese."
        }
      });
      
      return { text: response.text };
    } catch (error) {
      console.error('Gemini API Error:', error);
      return this.getMockAnalysisResult();
    }
  }

  async chatWithYear(history: {role: string, parts: string}[], message: string): Promise<string> {
    try {
      const chat = this.ai.chats.create({
        model: this.MODEL_ID,
        history: history.map(h => ({
          role: h.role,
          parts: [{ text: h.parts }]
        })),
        config: {
          systemInstruction: "You are the personification of the user's 2025 memory. Wise, calm, intimate voice."
        }
      });

      const response = await chat.sendMessage({ message });
      return response.text;
    } catch (error) {
      console.error('Gemini API Error:', error);
      return "记忆连接有些波动...";
    }
  }

  private getMockAnalysisResult(): { text: string } {
    const mockData = {
      keywords: [
        { word: "未连接", explanation: "API Key 异常。" },
        { word: "等待", explanation: "请检查网络或配置。" },
        { word: "演示", explanation: "这是一个预设的演示结果。" }
      ],
      portrait: {
        mentalCore: "探索模式",
        actionPattern: "正在配置环境",
        emotionalTone: "平静期待"
      },
      letterTitle: "致探索者",
      letterBody: "亲爱的，见信如晤。\n\n这封信来自系统的演示数据库。当你看到这行字时，说明 AI 服务暂时无法连接。\n\n在 2026 的入口处，期待你的真实故事。"
    };
    return { text: JSON.stringify(mockData) };
  }
}
