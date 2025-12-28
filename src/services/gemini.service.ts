
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
    let baseUrl = '';

    // 1. Try getting from Vite Build/Env injection
    try {
      const envKey = (process as any).env.API_KEY; 
      if (envKey) {
        apiKey = envKey;
      }
      // Allow custom base URL for proxies (useful in China)
      const envBase = (process as any).env.API_BASE_URL;
      if (envBase) {
          baseUrl = envBase;
      }
    } catch (e) {
      // Ignore
    }

    // 2. Fallback to Window Shim
    if (!apiKey || apiKey === 'undefined') {
      try {
        apiKey = (window as any).process?.env?.API_KEY || '';
      } catch (e) {}
    }

    // Debug Log
    const keyStatus = apiKey && apiKey.length > 10 ? `Present (${apiKey.substring(0,4)}...)` : 'MISSING';
    console.log(`[GeminiService] Initializing. API Key: ${keyStatus}, BaseURL: ${baseUrl || 'Default'}`);
    
    if (!apiKey || apiKey === 'MISSING_KEY' || apiKey === 'undefined') {
      console.warn('GeminiService: No API Key found. Switching to DEMO/OFFLINE MODE.');
      this.isDemoMode = true;
    } else {
      try {
        const options: any = { apiKey: apiKey };
        // If your SDK version supports custom transport/base URL, add it here.
        // Current @google/genai is strict, but we prepare the config.
        // For China: If apiKey is present but connection fails, we will fallback gracefully in generateYearReview.
        this._ai = new GoogleGenAI(options);
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
    return this._ai as GoogleGenAI;
  }

  async generateInspiration(questionText: string): Promise<string> {
    if (this.isDemoMode) {
      await this.delay(800);
      return "（离线灵感 / Offline Muse）\n灵感 1: 试着回忆那个午后的阳光。\n灵感 2: 也许是一次微不足道的相遇。";
    }

    const prompt = `
      The user is trying to answer this question about their year 2025: "${questionText}".
      They are stuck and need inspiration. 
      
      Please provide 2 short, distinct, and concrete *examples* of how someone might answer this question.
      
      Rules:
      1. Tone: Warm, reflective, "Morandi" style (calm and observant).
      2. Format: Just list the two examples. 
      3. Length: Keep examples concise (under 30 words each).
      4. Language: Provide the examples in Chinese.
      
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
      console.warn('Gemini API Error (likely network block):', error);
      return "灵感连接中断，请相信你内心的直觉。\n(Connection interrupted, trust your intuition.)";
    }
  }

  async generateYearReview(answers: Record<string, string>, colorContext: string): Promise<GenerateContentResponse> {
    if (this.isDemoMode) {
      await this.delay(3000); // Simulate "Thinking"
      return this.getMockAnalysisResult(colorContext);
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
        // We set a shorter timeout logic implicitly by catching errors
        const result = await this.ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json'
          }
        });
        return result;
    } catch (error) {
        console.error("API Error during review generation (Likely blocked in China)", error);
        // Fallback to the high-quality mock result so the user still gets a letter
        await this.delay(1000);
        return this.getMockAnalysisResult(colorContext);
    }
  }

  async chatWithYear(history: {role: string, parts: string}[], message: string): Promise<string> {
    if (this.isDemoMode) {
        await this.delay(1000);
        return "（离线模式）你的这一年充满了故事，我能感受到你在其中的成长与变化。无论未来如何，请保持这份觉察。";
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
        return "记忆连接有些波动... (Network/API Error)";
    }
  }

  // --- Helpers ---

  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generates a "Mock" result that looks indistinguishable from a real poetic analysis.
   * This is crucial for users in China without VPN/API Keys.
   */
  private getMockAnalysisResult(colorContext: string): any {
      // Select keywords based on color context loosely
      const isWarm = colorContext.toLowerCase().includes('sunshine') || colorContext.toLowerCase().includes('maple');
      
      const keywordsPool = isWarm 
        ? [
            { word: "炽热", explanation: "像你选定的底色一样，你的2025在燃烧中完成了某种蜕变。" },
            { word: "丰盈", explanation: "无论得到还是失去，你的生命体验在这一年变得前所未有的饱满。" },
            { word: "回响", explanation: "念念不忘，必有回响。你付出的那些坚持，此刻正以另一种方式归来。" }
          ]
        : [
            { word: "沉淀", explanation: "像一颗石子落入深海，你在喧嚣中找到了属于自己的重力。" },
            { word: "如常", explanation: "在无常的世界里，保持如常的生活节奏，这本身就是一种英雄主义。" },
            { word: "自洽", explanation: "不再寻求外界的认可，而是向内寻找逻辑，你完成了一次完美的闭环。" }
          ];

      const mockData = {
        keywords: keywordsPool,
        portrait: {
            mentalCore: "你正在经历一个向内探索的关键期。相比于外界的喧嚣，你更在意内心的秩序与安宁。",
            actionPattern: "看似按部就班，实则在每一个微小的选择中都埋下了伏笔。",
            emotionalTone: `正如你选择的底色，这一年你的基调是${isWarm ? '温暖而坚定' : '冷静而深邃'}的。`
        },
        letterTitle: "致 2025 的漫步者",
        letterBody: "亲爱的，见信如晤。\n\n当我翻阅你刚刚写下的这些答案，我仿佛看到你在这一年的光影里穿行的背影。虽然我无法通过网络连接到遥远的服务器来逐字解析你的故事，但我依然能从这些只言片语中，感受到你心脏跳动的频率。\n\n2025 年对你来说，或许并不是波澜壮阔的一年，但一定是在细节处见真章的一年。你在那些看似不起眼的瞬间里——一个发呆的午后，一次勇敢的拒绝，或是一首循环播放的老歌——完成了自我的重塑。你不再急于向世界证明什么，而是更愿意花时间与自己相处，这份“向内”的力量，是你今年最大的收获。\n\n不用遗憾我们未能通过AI相连，因为最深刻的答案，往往不需要算法来生成，它就藏在你敲下每一个字符时的犹豫与坚定里。\n\n愿你在未来的日子里，继续保持这份对生活的敏感与深情。\n\n在 2026 的入口处，请带上这份勇气。"
      };
      
      return {
          text: JSON.stringify(mockData),
          candidates: []
      };
  }
}
