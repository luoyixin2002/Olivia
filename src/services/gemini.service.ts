
import { Injectable } from '@angular/core';
import { GoogleGenAI, GenerateContentResponse, Chat } from '@google/genai';

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private _ai: GoogleGenAI | null = null;
  private isDemoMode = false;

  constructor() {
    this.init();
  }

  private init() {
    let apiKey = '';
    
    // 1. Try getting from Vite Build/Env injection (Best for Vercel)
    // We use explicit process.env.API_KEY so Vite's 'define' plugin can replace this exact string literal.
    try {
      // Use a temporary variable to allow Vite string replacement
      // If process.env.API_KEY is replaced by "my-key", this line becomes: const envKey = "my-key";
      // We purposefully access it directly, but wrap in try-catch in case 'process' is totally missing in some odd runtime
      // although Vite usually replaces the whole 'process.env.API_KEY' token.
      
      // Use 'as any' to avoid TS errors if types are missing, but rely on Vite replacement
      const envKey = (process as any).env.API_KEY; 
      if (envKey) {
        apiKey = envKey;
      }
    } catch (e) {
      // Ignore
    }

    // 2. Fallback to Window Shim (Best for local index.html editing)
    if (!apiKey || apiKey === 'undefined') {
      try {
        apiKey = (window as any).process?.env?.API_KEY || '';
      } catch (e) {}
    }

    // Debug Log (First 4 chars only for security)
    const keyStatus = apiKey && apiKey.length > 10 ? `Present (${apiKey.substring(0,4)}...)` : 'MISSING';
    console.log(`[GeminiService] Initializing. API Key Status: ${keyStatus}`);
    
    if (!apiKey || apiKey === 'MISSING_KEY' || apiKey === 'undefined') {
      console.warn('GeminiService: No API Key found. Switching to DEMO MODE.');
      this.isDemoMode = true;
    } else {
      try {
        this._ai = new GoogleGenAI({ apiKey: apiKey });
        this.isDemoMode = false;
      } catch (e) {
        console.error('GeminiService: Failed to initialize. Switching to DEMO MODE.', e);
        this.isDemoMode = true;
      }
    }
  }

  private get ai(): GoogleGenAI {
    if (!this._ai && !this.isDemoMode) {
        this.init();
    }
    // Return a dummy object if in demo mode to satisfy TS
    return this._ai as GoogleGenAI;
  }

  async generateInspiration(questionText: string): Promise<string> {
    if (this.isDemoMode) {
      await this.delay(1000); // Simulate network
      return `(演示模式 / Demo Mode)\n灵感示例 1: 在那个时刻，我感到了久违的宁静。\n灵感示例 2: 即使是微小的光芒，也照亮了我的整晚。`;
    }

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

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      return response.text.trim();
    } catch (error) {
      console.error('Gemini API Error:', error);
      return "灵感连接中断，请相信你内心的直觉。 (Connection failed, trust your intuition.)";
    }
  }

  async generateYearReview(answers: Record<string, string>, colorContext: string): Promise<GenerateContentResponse> {
    if (this.isDemoMode) {
      await this.delay(2500); // Simulate "Thinking"
      return this.getMockAnalysisResult();
    }

    const prompt = `
      You are a deeply insightful humanities writer and psychoanalyst. You are acting as the user's "Old Friend" who knows their soul.
      The user has answered 20 questions about their year 2025. 
      
      **CRITICAL CONTEXT - EMOTIONAL TONE**:
      The user has defined their year's color as: "${colorContext}".
      You MUST adjust the writing style and emotional temperature of the letter to match this color.
      
      Here are the user's answers:
      ${JSON.stringify(answers, null, 2)}

      STRICT RULES FOR CONTENT:
      1. **OPENING**: The letter MUST start exactly with these words: "亲爱的，见信如晤。"
      2. **CLOSING**: The letter MUST end exactly with these words: "在 2026 的入口处，请带上这份勇气。"
      3. **FORBIDDEN WORDS**: You are STRICTLY FORBIDDEN from using the words "希望" (hope), "快乐" (happy), "成功" (success), "加油" (jiayou). These are too generic. Instead use words like "安宁" (peace), "赤诚" (sincerity), "抵达" (arrival), "舒展" (unfold), "自洽" (self-consistent).
      4. **LENGTH**: The letter MUST be around 400 Chinese characters. Concise, profound, and impactful.
      5. **BE SPECIFIC**: Quote specific details from their answers. Connect these dots.
      6. **KEYWORDS**: Extract 3 distinct 2-character or 4-character Chinese keywords.

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
        "letterBody": "A ~400 word letter in Chinese. Narrative prose. Structure it like a real letter."
      }
      
      IMPORTANT: Return ONLY valid JSON. No markdown code blocks.
    `;

    try {
        return await this.ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json'
          }
        });
    } catch (error) {
        console.error("API Error during review generation", error);
        return this.getMockAnalysisResult();
    }
  }

  async chatWithYear(history: {role: string, parts: string}[], message: string): Promise<string> {
    if (this.isDemoMode) {
        await this.delay(1000);
        return "（这是演示模式的自动回复）你的这一年充满了故事，我能感受到你在其中的成长与变化。无论未来如何，请保持这份觉察。";
    }

    try {
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
    } catch (error) {
        return "记忆连接有些波动... (API Error)";
    }
  }

  // --- Helpers ---

  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getMockAnalysisResult(): any {
      const mockData = {
        keywords: [
            { word: "演示", explanation: "这是一个没有API Key时的演示状态。" },
            { word: "如常", explanation: "即便没有AI连接，生活依然按部就班。" },
            { word: "自洽", explanation: "在不完美的环境中，找到自己的逻辑。" }
        ],
        portrait: {
            mentalCore: "你处于一种探索与尝试的演示状态，内心平静但充满好奇。",
            actionPattern: "你尝试了点击按钮，并期待看到结果，这是一种积极的交互。",
            emotionalTone: "冷静、客观，带有一丝对技术的探索欲。"
        },
        letterTitle: "致无名的演示者",
        letterBody: "亲爱的，见信如晤。\n\n这是一封来自“演示模式”的信件。因为系统中未检测到有效的 Gemini API Key，我无法阅读你刚才用心写下的那些珍贵回忆，也无法为你生成专属的心理画像。\n\n但请不要遗憾。因为记录本身的意义，往往大于回顾的结果。当你逐一敲下那些答案时，你其实已经完成了对 2025 年的梳理。那些在深夜里闪过的念头，那些在备忘录里躺着的只言片语，此刻都已安放。\n\n如果你希望看到真正的 AI 分析，请申请一个免费的 Key 并重新配置。那是通往另一个维度的钥匙。\n\n在 2026 的入口处，请带上这份勇气。"
      };
      
      // Mock the structure of GenerateContentResponse
      return {
          text: JSON.stringify(mockData),
          candidates: []
      };
  }
}
