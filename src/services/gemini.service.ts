
import { Injectable } from '@angular/core';

// This service is named 'GeminiService' for compatibility with existing components,
// but it is implemented using the DeepSeek API.
@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private apiKey = '';
  private isDemoMode = false;
  
  // DeepSeek API Configuration
  private readonly API_URL = 'https://api.deepseek.com/chat/completions';
  private readonly MODEL = 'deepseek-chat'; // DeepSeek-V3

  constructor() {
    this.init();
  }

  private init() {
    // 1. Try getting from process.env (Vite replacement or Vercel env)
    try {
      const envKey = (process as any).env.API_KEY; 
      if (envKey) {
        this.apiKey = envKey;
      }
    } catch (e) {}

    // 2. Fallback to windowShim
    if (!this.apiKey || this.apiKey === 'undefined') {
      try {
        this.apiKey = (window as any).process?.env?.API_KEY || '';
      } catch (e) {}
    }

    // Validation
    const keyStatus = this.apiKey && this.apiKey.length > 5 ? 'Present' : 'MISSING';
    console.log(`[AiService] Initializing DeepSeek Client. Key: ${keyStatus}`);
    
    if (!this.apiKey || this.apiKey === 'MISSING_KEY' || this.apiKey === 'undefined') {
      console.warn('AiService: No API Key found. Switching to DEMO MODE.');
      this.isDemoMode = true;
    } else {
      this.isDemoMode = false;
    }
  }

  // --- DeepSeek Fetch Wrapper ---
  private async callDeepSeek(messages: any[], jsonMode = false): Promise<string> {
    if (this.isDemoMode) throw new Error('Demo Mode');

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
    };

    const body: any = {
        model: this.MODEL,
        messages: messages,
        stream: false,
        temperature: 1.3 // High temperature for creative writing
    };

    if (jsonMode) {
        body.response_format = { type: 'json_object' };
    }

    const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`DeepSeek API Error ${response.status}: ${err}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  // --- Public API ---

  async generateInspiration(questionText: string): Promise<string> {
    if (this.isDemoMode) {
      await this.delay(1000); 
      return `(演示/Demo)\n灵感：关于这个问题的某种深刻回忆...`;
    }

    const prompt = `
      The user is trying to answer this question about their year 2025: "${questionText}".
      They need inspiration. 
      Please provide 2 short, distinct, concrete *examples* of how someone might answer.
      Tone: Warm, reflective, Morandi style.
      Language: Chinese.
      Length: Under 30 words each.
      Format: Just the examples.
    `;

    try {
      return await this.callDeepSeek([
          { role: 'system', content: 'You are a helpful creative assistant.' },
          { role: 'user', content: prompt }
      ]);
    } catch (error) {
      console.error('API Error:', error);
      return "灵感连接中断，请相信你的直觉。";
    }
  }

  // Returns an object structure compatible with Google GenAI SDK for the component
  async generateYearReview(answers: Record<string, string>, colorContext: string): Promise<{ text: string }> {
    if (this.isDemoMode) {
      await this.delay(2500); 
      return this.getMockAnalysisResult();
    }

    const prompt = `
      You are a deeply insightful psychoanalyst and writer.
      User's Year Color: "${colorContext}". (Adjust emotional tone to match this).
      
      User's Answers:
      ${JSON.stringify(answers)}

      RULES:
      1. Opening: "亲爱的，见信如晤。"
      2. Closing: "在 2026 的入口处，请带上这份勇气。"
      3. No cliches (no "加油", "成功", "快乐"). Use "安宁", "自洽", "舒展".
      4. Length: ~400 Chinese characters.
      5. Extract 3 keywords.
      
      Output JSON strictly:
      {
        "keywords": [{ "word": "Chinese", "explanation": "..." }],
        "portrait": { "mentalCore": "...", "actionPattern": "...", "emotionalTone": "..." },
        "letterTitle": "...",
        "letterBody": "..."
      }
    `;

    try {
        const content = await this.callDeepSeek([
            { role: 'system', content: 'You are a poetic psychoanalyst. You output valid JSON only.' },
            { role: 'user', content: prompt }
        ], true); // Enable JSON mode
        
        return { text: content };
    } catch (error) {
        console.error("API Error:", error);
        return this.getMockAnalysisResult();
    }
  }

  async chatWithYear(history: {role: string, parts: string}[], message: string): Promise<string> {
    if (this.isDemoMode) {
        await this.delay(1000);
        return "（演示模式）我在听。请继续说...";
    }

    // Convert history format from component (Gemini style) to DeepSeek (OpenAI style)
    // Component history: { role: 'user' | 'model', parts: string }
    // OpenAI history: { role: 'user' | 'assistant', content: string }
    
    const messages = history.map(h => ({
        role: h.role === 'model' ? 'assistant' : 'user',
        content: h.parts
    }));

    // Add system prompt
    messages.unshift({
        role: 'system',
        content: "You are the personification of the user's 2025 memory. Wise, calm, intimate, Morandi-toned voice."
    });

    // Add current message
    messages.push({ role: 'user', content: message });

    try {
        return await this.callDeepSeek(messages);
    } catch (error) {
        return "记忆连接有些波动...";
    }
  }

  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getMockAnalysisResult(): any {
      const mockData = {
        keywords: [
            { word: "演示", explanation: "无 API Key 状态。" },
            { word: "静默", explanation: "安静地等待连接。" },
            { word: "自洽", explanation: "逻辑自洽的模拟。" }
        ],
        portrait: {
            mentalCore: "探索演示状态。",
            actionPattern: "点击与交互。",
            emotionalTone: "冷静客观。"
        },
        letterTitle: "致演示者",
        letterBody: "亲爱的，见信如晤。\n\n这是一封来自“演示模式”的信件。因为系统中未检测到有效的 API Key (DeepSeek)，我无法阅读你的回忆。\n\n但记录本身的意义，大于回顾的结果。请在 Vercel 环境变量中配置 API_KEY。\n\n在 2026 的入口处，请带上这份勇气。"
      };
      
      return {
          text: JSON.stringify(mockData)
      };
  }
}
