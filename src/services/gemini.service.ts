
import { Injectable } from '@angular/core';

// This service handles DeepSeek API calls.
// Using 'GeminiService' name to maintain compatibility with existing components.
@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private apiKey = '';
  private isDemoMode = false;
  
  // DeepSeek API Endpoint
  private readonly API_URL = 'https://api.deepseek.com/chat/completions';
  private readonly MODEL = 'deepseek-chat';

  constructor() {
    this.init();
  }

  private init() {
    // 1. Try process.env (Vite define)
    try {
      if (process.env['API_KEY']) {
        this.apiKey = process.env['API_KEY'];
      }
    } catch (e) {}

    // 2. Fallback for safety
    if (!this.apiKey) {
      // Check if it's in the window shim
      const winEnv = (window as any).process?.env?.API_KEY;
      if (winEnv) this.apiKey = winEnv;
    }

    // Check status
    if (!this.apiKey || this.apiKey.includes('your-api-key')) {
      console.warn('[AI Service] No valid API Key found. Using DEMO/MOCK mode.');
      this.isDemoMode = true;
    } else {
      console.log('[AI Service] DeepSeek API Key loaded.');
      this.isDemoMode = false;
    }
  }

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
        temperature: 1.3 // High creativity
    };

    if (jsonMode) {
        body.response_format = { type: 'json_object' };
    }

    try {
      const response = await fetch(this.API_URL, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(body)
      });

      if (!response.ok) {
          const errText = await response.text();
          throw new Error(`API Error ${response.status}: ${errText}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (e) {
      console.error('DeepSeek fetch failed', e);
      throw e;
    }
  }

  // --- Public Methods ---

  async generateInspiration(questionText: string): Promise<string> {
    if (this.isDemoMode) {
      await this.delay(800);
      return "（演示模式）也许你可以试着回忆一下夏天的那个午后...";
    }

    const prompt = `
      The user is answering: "${questionText}".
      Provide 2 short, distinct, concrete examples of how someone might answer.
      Tone: Warm, reflective, Morandi style, Chinese.
      Length: Under 30 words each.
      Format: Just the examples text.
    `;

    try {
      return await this.callDeepSeek([
          { role: 'system', content: 'You are a helpful muse.' },
          { role: 'user', content: prompt }
      ]);
    } catch (error) {
      return "灵感信号微弱，请听从内心的声音。";
    }
  }

  async generateYearReview(answers: Record<string, string>, colorContext: string): Promise<{ text: string }> {
    if (this.isDemoMode) {
      await this.delay(2000);
      return this.getMockAnalysisResult();
    }

    const prompt = `
      You are a gentle psychoanalyst.
      User's Color: "${colorContext}".
      User's Answers: ${JSON.stringify(answers)}

      Output JSON strictly:
      {
        "keywords": [{ "word": "Chinese Word", "explanation": "Short logic" }],
        "portrait": { "mentalCore": "...", "actionPattern": "...", "emotionalTone": "..." },
        "letterTitle": "Poetic Title",
        "letterBody": "A warm letter (~300 chars). Start: '亲爱的，见信如晤。' End: '在 2026 的入口处，请带上这份勇气。'"
      }
    `;

    try {
        const content = await this.callDeepSeek([
            { role: 'system', content: 'You are a poetic writer. Output JSON only.' },
            { role: 'user', content: prompt }
        ], true);
        
        return { text: content };
    } catch (error) {
        console.error(error);
        return this.getMockAnalysisResult();
    }
  }

  async chatWithYear(history: {role: string, parts: string}[], message: string): Promise<string> {
    if (this.isDemoMode) {
        await this.delay(1000);
        return "（演示模式）我在听，请继续...";
    }

    // Map to OpenAI/DeepSeek format
    const messages = history.map(h => ({
        role: h.role === 'model' ? 'assistant' : 'user',
        content: h.parts
    }));

    messages.unshift({
        role: 'system',
        content: "You are the personification of the user's 2025 memory. Wise, calm, intimate voice."
    });

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
            { word: "未连接", explanation: "API Key 未配置。" },
            { word: "等待", explanation: "需要在 Vercel 设置环境变量。" },
            { word: "演示", explanation: "这是一个预设的演示结果。" }
        ],
        portrait: {
            mentalCore: "探索模式",
            actionPattern: "正在配置环境",
            emotionalTone: "平静期待"
        },
        letterTitle: "致探索者",
        letterBody: "亲爱的，见信如晤。\n\n这封信来自系统的演示数据库。当你看到这行字时，说明网站已成功部署运行，但尚未配置 DeepSeek 的 API Key。\n\n请在 Vercel 后台的 Settings -> Environment Variables 中添加 API_KEY 变量。\n\n在 2026 的入口处，期待你的真实故事。"
      };
      return { text: JSON.stringify(mockData) };
  }
}
