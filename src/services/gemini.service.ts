
import { Injectable } from '@angular/core';

// Interfaces for DeepSeek/OpenAI compatible API
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  // DeepSeek V3 Endpoint
  private readonly API_URL = 'https://api.deepseek.com/chat/completions';
  private apiKey: string = '';
  private isDemoMode = false;

  constructor() {
    this.init();
  }

  private init() {
    let key = '';

    // Vercel / Vite Environment Variable Handling
    // Vite replaces 'process.env.API_KEY' with the actual string during build.
    // We access it directly so the replacement works.
    try {
      // @ts-ignore
      const envKey = process.env.API_KEY;
      if (envKey && typeof envKey === 'string' && envKey.length > 0) {
        key = envKey;
      }
    } catch (e) {}

    // Fallback: Check window shim (often used in simple HTML wrappers or local dev)
    if (!key) {
      try {
        key = (window as any).process?.env?.API_KEY || '';
      } catch (e) {}
    }

    this.apiKey = key;

    // Debug Log (Masked)
    const keyStatus = this.apiKey && this.apiKey.length > 5 ? `Present (${this.apiKey.substring(0,4)}...)` : 'MISSING';
    console.log(`[DeepSeek Service] Initializing. API Key: ${keyStatus}`);
    
    if (!this.apiKey || this.apiKey === 'undefined') {
      console.warn('DeepSeek Service: No API Key found. Make sure to set API_KEY in Vercel Environment Variables.');
      this.isDemoMode = true;
    }
  }

  /**
   * Core Helper to call DeepSeek API
   */
  private async callDeepSeek(messages: ChatMessage[], temperature = 1.3, jsonMode = false): Promise<string> {
    if (this.isDemoMode) throw new Error('Demo Mode');

    try {
      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat', 
          messages: messages,
          temperature: temperature, 
          response_format: jsonMode ? { type: 'json_object' } : { type: 'text' },
          stream: false
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('DeepSeek API Error:', response.status, errText);
        throw new Error(`API Error: ${response.status}`);
      }

      const data: ChatResponse = await response.json();
      return data.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('Network/Fetch Error:', error);
      throw error;
    }
  }

  async generateInspiration(questionText: string): Promise<string> {
    if (this.isDemoMode) {
      await this.delay(800);
      return "（离线灵感）\n灵感 1: 试着回忆那个午后的阳光。\n灵感 2: 也许是一次微不足道的相遇。";
    }

    const systemPrompt = `
      你是一个温暖、敏锐的“莫兰迪色系”风格的心理咨询师。
      用户在回顾2025年时卡住了，需要你的灵感启发。
      请提供2个简短、具体、画面感强的回答范例。
      
      要求：
      1. 语言风格：温柔、细腻、具有文学性。
      2. 格式：仅列出两个例子，不需要额外寒暄。
      3. 字数：每个例子不超过30字。
      
      输出格式：
      范例 1: ...
      范例 2: ...
    `;

    try {
      const result = await this.callDeepSeek([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `关于这个问题：“${questionText}”，请给我一点灵感。` }
      ], 1.2); 
      return result.trim();
    } catch (error) {
      return "灵感连接中断，请相信你内心的直觉。\n(Connection interrupted, trust your intuition.)";
    }
  }

  async generateYearReview(answers: Record<string, string>, colorContext: string): Promise<any> {
    if (this.isDemoMode) {
      await this.delay(3000);
      return this.getMockAnalysisResult(colorContext);
    }

    const prompt = `
      你是一位深刻的人文观察者和心理分析师，也是用户的一位灵魂知己。
      用户回答了关于2025年的20个问题。请根据这些回答，为他/她写一封年终总结信。

      **核心基调**：
      用户定义的年度底色是：“${colorContext}”。
      你必须调整信件的文风、情感温度来匹配这个颜色。

      **用户回答数据**：
      ${JSON.stringify(answers)}

      **必须遵守的规则**：
      1. **开头**：必须严格以“亲爱的，见信如晤。”开头。
      2. **结尾**：必须严格以“在 2026 的入口处，请带上这份勇气。”结尾。
      3. **禁词**：严禁使用“希望”、“快乐”、“成功”、“加油”这些陈词滥调。请使用“安宁”、“赤诚”、“抵达”、“舒展”、“自洽”、“微光”等更具质感的词汇。
      4. **篇幅**：信件正文约 400 字左右。
      5. **细节**：必须引用用户回答中的具体细节（如特定的人、事、遗憾），让信件通过“点对点”的连接直击人心。
      6. **JSON格式**：必须返回符合 JSON 语法的纯文本。

      请返回以下 JSON 结构：
      {
        "keywords": [
          { "word": "二字或四字中文关键词", "explanation": "如诗般的简短解读" },
          { "word": "二字或四字中文关键词", "explanation": "如诗般的简短解读" },
          { "word": "二字或四字中文关键词", "explanation": "如诗般的简短解读" }
        ],
        "portrait": {
          "mentalCore": "一句话描述精神内核...",
          "actionPattern": "一句话分析行为模式...",
          "emotionalTone": "一句话定调情感色彩..."
        },
        "letterTitle": "一个极具文学感的四字或七字标题",
        "letterBody": "信件正文内容，注意换行符的使用。"
      }
    `;

    try {
      // Explicitly mention JSON in system prompt for DeepSeek JSON mode
      const result = await this.callDeepSeek([
        { role: 'system', content: '你是一个输出 JSON 格式的专业作家助手。请确保输出合法的 JSON 字符串。' },
        { role: 'user', content: prompt }
      ], 1.1, true); // JSON Mode = true
      
      return {
        text: result
      };

    } catch (error) {
      console.error("DeepSeek Generation Error", error);
      await this.delay(1000);
      return this.getMockAnalysisResult(colorContext);
    }
  }

  async chatWithYear(history: {role: string, parts: string}[], message: string): Promise<string> {
    if (this.isDemoMode) {
      await this.delay(1000);
      return "（离线模式）你的这一年充满了故事，我能感受到你在其中的成长与变化。";
    }

    const messages: ChatMessage[] = [
      { 
        role: 'system', 
        content: "你就是用户2025年记忆的化身。你睿智、平静、亲密。你的声音是莫兰迪色调的——不刺眼，但温润有力。你知道用户今年经历的一切。请用中文简短、深情地回应。" 
      }
    ];

    history.forEach(h => {
      messages.push({
        role: h.role === 'model' ? 'assistant' : 'user',
        content: h.parts
      });
    });

    messages.push({ role: 'user', content: message });

    try {
      const response = await this.callDeepSeek(messages, 1.0);
      return response;
    } catch (error) {
      return "记忆的信号有些波动... (网络连接中断)";
    }
  }

  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getMockAnalysisResult(colorContext: string): any {
      const isWarm = colorContext.toLowerCase().includes('warm') || colorContext.toLowerCase().includes('nature');
      
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
        letterBody: "亲爱的，见信如晤。\n\n当我翻阅你刚刚写下的这些答案，我仿佛看到你在这一年的光影里穿行的背影。虽然暂时无法通过DeepSeek连接到你的故事，但我依然能从这些只言片语中，感受到你心脏跳动的频率。\n\n2025 年对你来说，或许并不是波澜壮阔的一年，但一定是在细节处见真章的一年。你在那些看似不起眼的瞬间里——一个发呆的午后，一次勇敢的拒绝，或是一首循环播放的老歌——完成了自我的重塑。你不再急于向世界证明什么，而是更愿意花时间与自己相处，这份“向内”的力量，是你今年最大的收获。\n\n不用遗憾我们未能通过网络相连，因为最深刻的答案，往往不需要AI来生成，它就藏在你敲下每一个字符时的犹豫与坚定里。\n\n愿你在未来的日子里，继续保持这份对生活的敏感与深情。\n\n在 2026 的入口处，请带上这份勇气。"
      };
      
      return {
          text: JSON.stringify(mockData)
      };
  }
}
