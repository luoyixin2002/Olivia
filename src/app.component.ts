
import { Component, signal, inject, computed, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuestionCardComponent, Question } from './components/question-card.component';
import { GeminiService } from './services/gemini.service';
import { JellyCapsuleDirective } from './directives/jelly-capsule.directive';

// Declare html2canvas globally as it is loaded via script tag
declare var html2canvas: any;

interface AnalysisResult {
  keywords: { word: string; explanation: string }[];
  portrait: {
    mentalCore: string;
    actionPattern: string;
    emotionalTone: string;
  };
  letterTitle: string;
  letterBody: string;
}

interface YearColor {
  id: string;
  name: string;
  desc: string;
  // Visuals
  previewClass: string;
  // CSS Gradients for the capsule
  capsuleTop: string;
  capsuleBottom: string;
  // AI Context
  aiContext: string;
  // Particle Type for visual feedback
  particleType: 'stone' | 'feather'; 
  particleColor: string; // CSS color string
}

interface MemoryParticle {
  id: number;
  type: 'stone' | 'feather';
  left: number; // percentage or px offset
  bottom: number; // px offset
  rotation: number;
  scale: number;
  color: string;
  borderRadius?: string; // for stones
  animationDelay: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, QuestionCardComponent, JellyCapsuleDirective],
  templateUrl: './app.component.html'
})
export class AppComponent implements OnDestroy {
  private geminiService = inject(GeminiService);

  @ViewChild('reportNode') reportNode!: ElementRef;
  @ViewChild('bgmInput') bgmInput!: ElementRef<HTMLInputElement>;

  // App States: 'intro' -> 'color-selection' -> 'unlocking' -> 'questions' -> ...
  viewState = signal<'intro' | 'color-selection' | 'unlocking' | 'questions' | 'loading' | 'results'>('intro');
  
  // Color Selection
  selectedColor = signal<YearColor | null>(null);
  
  // Memory Particles (The pile of stones/feathers)
  memoryParticles = signal<MemoryParticle[]>([]);
  
  // Audio State
  isAudioPlaying = signal(false);
  // Default to false (pessimistic) - only set true if 'canplay' fires
  hasAudioSource = signal(false); 
  private audio: HTMLAudioElement;

  readonly colorOptions: YearColor[] = [
    {
      id: 'sunshine',
      name: '阳光金 · Sunshine',
      desc: '流动的光斑，温暖的定力。',
      previewClass: 'bg-gradient-to-br from-[#E6C767] to-[#B8933A]',
      capsuleTop: 'linear-gradient(135deg, #E6C767, #D4AC0D)',
      capsuleBottom: 'linear-gradient(45deg, #B8933A, #E6C767)',
      aiContext: 'Sunshine Gold. Tone: Radiant, warm, optimistic, confident but grounded. Focus on brightness, hope, and clarity. Like the noon sun warming the earth.',
      particleType: 'stone',
      particleColor: 'rgba(230, 199, 103, 0.9)'
    },
    {
      id: 'serene',
      name: '静谧蓝 · Serene',
      desc: '深海的沉默，理性的回响。',
      previewClass: 'bg-gradient-to-br from-[#8E9AAF] to-[#2C3E50]',
      capsuleTop: 'linear-gradient(135deg, #8E9AAF, #4A5D75)',
      capsuleBottom: 'linear-gradient(45deg, #2C3E50, #8E9AAF)',
      aiContext: 'Serene Blue. Tone: Calm, deep, intellectual, slightly melancholic but peaceful. Like the deep sea.',
      particleType: 'feather',
      particleColor: 'rgba(142, 154, 175, 0.6)'
    },
    {
      id: 'mint',
      name: '薄荷绿 · Healing',
      desc: '新生的缝隙，治愈的呼吸。',
      previewClass: 'bg-gradient-to-br from-[#A6B08E] to-[#5F6B4E]',
      capsuleTop: 'linear-gradient(135deg, #A6B08E, #7A8568)',
      capsuleBottom: 'linear-gradient(45deg, #5F6B4E, #A6B08E)',
      aiContext: 'Sage/Mint Green. Tone: Healing, organic, growing, fresh. Focus on recovery and nature.',
      particleType: 'feather',
      particleColor: 'rgba(166, 176, 142, 0.6)'
    },
    {
      id: 'stoic',
      name: '沉稳灰 · Stoic',
      desc: '极简的留白，内向的秩序。',
      previewClass: 'bg-gradient-to-br from-[#C4C4C4] to-[#4A4A4A]',
      capsuleTop: 'linear-gradient(135deg, #C4C4C4, #777777)',
      capsuleBottom: 'linear-gradient(45deg, #4A4A4A, #999999)',
      aiContext: 'Stoic Gray. Tone: Minimalist, rational, objective, quiet, strong. Focus on structure and truth.',
      particleType: 'stone',
      particleColor: 'rgba(150, 150, 150, 0.8)'
    },
    {
      id: 'maple',
      name: '枫叶红 · Maple',
      desc: '燃烧的诗意，成熟的深情。',
      previewClass: 'bg-gradient-to-br from-[#D96C63] to-[#8F3630]',
      capsuleTop: 'linear-gradient(135deg, #D96C63, #A6423A)',
      capsuleBottom: 'linear-gradient(45deg, #8F3630, #D96C63)',
      aiContext: 'Maple Red. Tone: Deep, mature, passionate, poetic, autumnal. Focus on harvest, settling, rich emotions, and the beauty of passing time.',
      particleType: 'feather', // Leaves float
      particleColor: 'rgba(217, 108, 99, 0.8)'
    }
  ];

  currentStep = signal(0);
  answers = signal<Record<string, string>>({});
  
  // Unlock Logic
  unlockProgress = signal(0);
  isUnlocking = signal(false);
  private unlockInterval: any;
  
  // Analysis Data
  analysisResult = signal<AnalysisResult | null>(null);
  
  // Computed property to split letter into paragraphs for proper indentation
  letterParagraphs = computed(() => {
    const body = this.analysisResult()?.letterBody || '';
    // Split by newlines, filter out empty strings
    return body.split(/\n+/).map(p => p.trim()).filter(p => p.length > 0);
  });
  
  // Inspiration Feature
  currentInspiration = signal<string | null>(null);
  isGettingInspiration = signal(false);

  // UI Feedback
  showCheckpoint = signal(false);
  checkpointMessage = signal('');
  
  // Chat
  chatInput = signal('');
  chatHistory = signal<{role: string, parts: string}[]>([]);
  isChatLoading = signal(false);

  // Report Generation
  isGeneratingReport = signal(false);
  generatedReportUrl = signal<string | null>(null);

  // Questions Data
  readonly questions: Question[] = [
    // Group 1: Life Records
    { 
      id: 'q1', 
      category: '生活实录 (Life Records)', 
      textZh: '年度私藏：2025 年，哪一件被你带回家的物件，最真切地抚平了你的生活？', 
      textEn: 'Which object brought home this year most truly soothed your life?',
      placeholder: '哪怕是一个普通的杯子，只要它曾温暖你...' 
    },
    { 
      id: 'q2', 
      category: '生活实录 (Life Records)', 
      textZh: '栖息之地：除了床和工位，这一年哪个角落承载了你最多的发呆或思考时刻？', 
      textEn: 'Besides your bed and desk, which corner held your most moments of daydreaming or thinking?',
      placeholder: '那个让你感到安全的角落是哪里？' 
    },
    { 
      id: 'q3', 
      category: '生活实录 (Life Records)', 
      textZh: '耳边回响：哪一段旋律响起时，能让你瞬间辨认出 2025 年的味道？', 
      textEn: 'Which melody, when played, instantly makes you recognize the flavor of 2025?',
      placeholder: '或许是一句歌词，或许是雨声...' 
    },
    { 
      id: 'q4', 
      category: '生活实录 (Life Records)', 
      textZh: '生命韵律：这一年，你的身体是在规律的节奏中自洽，还是在疲惫的缝隙里喘息？', 
      textEn: 'This year, was your body consistent in rhythm, or gasping for breath in the cracks of fatigue?',
      placeholder: '诚实地面对身体的感受，它会告诉你答案。' 
    },
    { 
      id: 'q5', 
      category: '生活实录 (Life Records)', 
      textZh: '视觉切片：翻开手机相册，哪张照片或截图是你 2025 年最不舍得删去的记忆锚点？', 
      textEn: 'Opening your photo album, which photo or screenshot is the memory anchor you are most reluctant to delete?',
      placeholder: '描述那个画面，不用在意构图，只在意回忆。' 
    },
    
    // Group 2: Action Traces
    { 
      id: 'q6', 
      category: '行动痕迹 (Action Traces)', 
      textZh: '微光技能：今年你点亮了哪项以前从未尝试过的小技能，让生活多了一点底气？', 
      textEn: 'What small skill did you light up this year that you had never tried before, adding a bit of confidence to life?',
      placeholder: '哪怕只是学会了做一道菜...' 
    },
    { 
      id: 'q7', 
      category: '行动痕迹 (Action Traces)', 
      textZh: '长情刻度：这一年，你最执着、甚至有些“笨拙”地坚持下来的一件事是什么？', 
      textEn: 'What is the one thing you persisted in this year, perhaps obsessively or even "clumsily"?',
      placeholder: '那些看似无用的坚持，往往最珍贵。' 
    },
    { 
      id: 'q8', 
      category: '行动痕迹 (Action Traces)', 
      textZh: '远方投生：2025 年，哪次抵达让你觉得短暂地逃离了平庸，见到了不一样的风景？', 
      textEn: 'In 2025, which arrival made you feel like you briefly escaped mediocrity and saw a different scenery?',
      placeholder: '不一定是旅行，也可以是心灵的抵达。' 
    },
    { 
      id: 'q9', 
      category: '行动痕迹 (Action Traces)', 
      textZh: '清空仪式：今年你从生命中彻底丢弃或告别的最沉重的一样东西（实物或旧物）是什么？', 
      textEn: 'What was the heaviest thing (physical or past) that you completely discarded or said goodbye to this year?',
      placeholder: '放手的那一刻，你的感受是？' 
    },
    { 
      id: 'q10', 
      category: '行动痕迹 (Action Traces)', 
      textZh: '职业剪影：在工作或学业的奔波中，哪一个瞬间让你感受到“终于熬过来了”的如释重负？', 
      textEn: 'In the rush of work or study, which moment made you feel the relief of "finally surviving it"?',
      placeholder: '哪怕只有几秒钟的轻松...' 
    },

    // Group 3: Human Connections
    { 
      id: 'q11', 
      category: '人际连接 (Connections)', 
      textZh: '频繁坐标：谁是你 2025 年通讯录里那个最常亮起、也最让你安心的名字？', 
      textEn: 'Who is the name in your 2025 contacts that lit up most often and brought you the most peace?',
      placeholder: '写下那个名字，或者那个称呼。' 
    },
    { 
      id: 'q12', 
      category: '人际连接 (Connections)', 
      textZh: '意外相逢：今年哪一位新相识的人，像一束光一样照亮了你某个认知盲区？', 
      textEn: 'Which new acquaintance this year illuminated a cognitive blind spot like a beam of light?',
      placeholder: '他/她说的一句话，让你记到了现在...' 
    },
    { 
      id: 'q13', 
      category: '人际连接 (Connections)', 
      textZh: '无名暖意：记录一个来自陌生人或世界的微小善意，它曾在哪个寒冷的时刻治愈过你？', 
      textEn: 'Record a tiny kindness from a stranger or the world that healed you in a cold moment.',
      placeholder: '那个瞬间，世界变得温柔了吗？' 
    },
    { 
      id: 'q14', 
      category: '人际连接 (Connections)', 
      textZh: '关系的减法：这一年，你淡出了哪一段不再产生共振的关系，找回了多少自在？', 
      textEn: 'Which relationship that no longer resonated did you fade out of this year, and how much freedom did you regain?',
      placeholder: '离开也是一种成长。' 
    },

    // Group 4: Emotional Fragments
    { 
      id: 'q15', 
      category: '情绪碎片 (Emotional Fragments)', 
      textZh: '精神避难所：当世界喧嚣或压力来袭时，你习惯躲进哪种习惯或爱好中悄悄“回血”？', 
      textEn: 'When the world is noisy or stressful, what habit or hobby do you hide in to quietly "regenerate"?',
      placeholder: '那里只有你和安宁。' 
    },
    { 
      id: 'q16', 
      category: '情绪碎片 (Emotional Fragments)', 
      textZh: '年度旁白：如果给你的 2025 配上一个高频出现的口头禅，那个词会是什么？', 
      textEn: 'If you were to dub your 2025 with a frequently used catchphrase, what would it be?',
      placeholder: '是你对自己说得最多的一句话。' 
    },
    { 
      id: 'q17', 
      category: '情绪碎片 (Emotional Fragments)', 
      textZh: '泪水出口：今年哪一次被文艺作品（书影音）击中的瞬间，让你借由他人的故事流了自己的泪？', 
      textEn: 'Which moment struck by a literary/artistic work (book/movie/music) made you cry your own tears through another\'s story?',
      placeholder: '是感动，还是释怀？' 
    },
    { 
      id: 'q18', 
      category: '情绪碎片 (Emotional Fragments)', 
      textZh: '破壳瞬间：2025 年，你做过最勇敢、最不顾后果的一次“自我主张”是什么？', 
      textEn: 'In 2025, what was the bravest, most reckless act of "self-assertion" you performed?',
      placeholder: '那一刻，你只听从了自己。' 
    },

    // Group 5: Farewell & Handoff
    { 
      id: 'q19', 
      category: '告别与交棒 (Farewell)', 
      textZh: '生命色彩：如果 2025 年是一块画布，你会为它涂抹上怎样的底色和评分？', 
      textEn: 'If 2025 were a canvas, what background color and score would you give it?',
      placeholder: '颜色代表心情，分数代表无悔。' 
    },
    { 
      id: 'q20', 
      category: '告别与交棒 (Farewell)', 
      textZh: '通关密语：跨过 2025 的门槛，你想对那个在未来守候的自己，预留一个什么词作为接头暗号？', 
      textEn: 'Crossing the threshold of 2025, what word do you want to leave as a secret code for your future self?',
      placeholder: '一个词，连接现在与未来。' 
    }
  ];

  constructor() {
    this.audio = new Audio();
    this.audio.loop = true;
    this.audio.volume = 0.5;
    
    const audioPath = 'assets/bgm.mp3';
    this.audio.src = audioPath;
    
    // Improved Error Handling: Default is now "Not Found" until proven otherwise.
    this.audio.onerror = (e) => {
      console.warn(`Could not load audio from ${audioPath}.`, e);
      this.hasAudioSource.set(false);
      
      // If we are in the browser and the error is real 404, we might want to alert if user tries to play
      // But signals handle the UI update automatically.
    };

    // Only when we are SURE we can play, we enable the feature.
    this.audio.oncanplay = () => {
      this.hasAudioSource.set(true);
    };

    this.audio.load();
  }

  ngOnDestroy() {
    this.audio.pause();
    this.audio.src = '';
  }

  toggleAudio() {
    // If hasAudioSource is false, it means loading failed or file missing.
    // Trigger upload immediately.
    if (!this.hasAudioSource()) {
      alert("无法加载默认音乐 (assets/bgm.mp3)。\n请检查文件是否上传，或现在手动选择一首本地音乐。");
      this.bgmInput.nativeElement.click();
      return;
    }

    if (this.audio.paused) {
      this.audio.play().then(() => {
         this.isAudioPlaying.set(true);
      }).catch(e => {
         console.warn('Playback prevented', e);
         // If error is NotSupported or NotAllowed, it's autoplay policy.
         // If error is 404 related (sometimes shows as encoding error), fallback to upload.
         if (e.code === 4) { // NotSupportedError (often missing source)
             this.hasAudioSource.set(false);
             this.bgmInput.nativeElement.click();
         }
      });
    } else {
      this.audio.pause();
      this.isAudioPlaying.set(false);
    }
  }

  onBgmFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const objectUrl = URL.createObjectURL(file);
      
      this.audio.src = objectUrl;
      this.audio.load();
      // Force true because user just selected a valid file
      this.hasAudioSource.set(true);
      
      this.audio.play().then(() => {
        this.isAudioPlaying.set(true);
      }).catch(e => console.error(e));
    }
  }

  progress = computed(() => {
    return ((this.currentStep() + 1) / this.questions.length) * 100;
  });

  currentQuestion = computed(() => this.questions[this.currentStep()]);

  startJourney() {
    // Attempt to play audio if loaded
    if (this.hasAudioSource() && this.audio.paused) {
        this.toggleAudio();
    }
    
    // Go to Color Selection first
    this.viewState.set('color-selection');
  }

  // ** NEW: RESET FUNCTION **
  // Strictly clears all previous memory state
  resetJourney() {
    // 1. Clear Answers
    this.answers.set({});
    
    // 2. Clear Chat History
    this.chatHistory.set([]);
    
    // 3. Clear Analysis
    this.analysisResult.set(null);
    
    // 4. Reset Steps
    this.currentStep.set(0);
    this.unlockProgress.set(0);
    
    // 5. Reset Particles
    this.memoryParticles.set([]);

    // 6. Reset Color (Optional, but good for total reset)
    this.selectedColor.set(null);

    // 7. Reset View
    this.viewState.set('intro');
  }

  confirmColor(color: YearColor) {
    this.selectedColor.set(color);
    
    // Transition to Unlock
    this.unlockProgress.set(0);
    this.viewState.set('unlocking');
  }

  // Unlock Logic
  startUnlock() {
    if (this.unlockProgress() >= 100) return;
    
    this.isUnlocking.set(true);
    
    // Clear any existing interval just in case
    clearInterval(this.unlockInterval);
    
    // Fill in 2 seconds (20ms * 100 steps)
    this.unlockInterval = setInterval(() => {
      this.unlockProgress.update(val => {
        if (val >= 100) {
          this.completeUnlock();
          return 100;
        }
        return val + 1.5; // Tuning speed
      });
    }, 20);
  }

  endUnlock() {
    // If not complete, reset
    if (this.unlockProgress() < 100) {
      clearInterval(this.unlockInterval);
      this.isUnlocking.set(false);
      
      // Animate back to 0 rapidly
      const decrease = setInterval(() => {
        this.unlockProgress.update(val => {
           if (val <= 0) {
             clearInterval(decrease);
             return 0;
           }
           return val - 5;
        });
      }, 10);
    }
  }

  completeUnlock() {
    clearInterval(this.unlockInterval);
    
    // Haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate([50, 50, 200]);
    }
    
    // Small delay for the visual "open" animation to play
    setTimeout(() => {
      this.viewState.set('questions');
    }, 800);
  }

  async getInspiration() {
    if (this.isGettingInspiration()) return;
    this.isGettingInspiration.set(true);
    this.currentInspiration.set(null); // clear old

    try {
      // Pass both languages to context but ask for a prompt
      const hint = await this.geminiService.generateInspiration(this.currentQuestion().textZh);
      this.currentInspiration.set(hint);
    } catch (e) {
      console.error(e);
      this.currentInspiration.set("闭上眼睛深呼吸，答案就在你心里。 (Close your eyes, the answer is within.)");
    } finally {
      this.isGettingInspiration.set(false);
    }
  }

  handleAnswer(answer: string) {
    const q = this.currentQuestion();
    
    // Save answer
    const currentAnswers = { ...this.answers() };
    currentAnswers[q.id] = answer;
    this.answers.set(currentAnswers);
    
    // Add Memory Particle Visual
    this.addMemoryParticle();

    // Clear inspiration for next question
    this.currentInspiration.set(null);

    const stepIndex = this.currentStep();
    
    // Check for "checkpoint" every 4-5 questions
    if (stepIndex < this.questions.length - 1) {
      if ((stepIndex + 1) % 5 === 0) {
        this.triggerCheckpoint(stepIndex + 1);
      }
      this.currentStep.update(i => i + 1);
    } else {
      this.finishAndAnalyze();
    }
  }

  addMemoryParticle() {
    const color = this.selectedColor();
    if (!color) return;

    const index = this.memoryParticles().length;
    
    // Tighter pile for corner accumulation (Mountain Shape)
    // Base width decreases as it goes up (pyramid/mountain shape)
    // Adjusted range to be tighter: 120px base spread reducing by 4px per item
    const spread = Math.max(20, 120 - index * 4); 
    const randomXOffset = (Math.random() - 0.5) * spread;
    
    // Height increases slowly to build density
    const heightBase = index * 6;
    const randomYOffset = Math.random() * 10;

    // Create organic border radius for stones
    const borderRadius = color.particleType === 'stone' 
      ? `${Math.floor(30 + Math.random()*40)}% ${Math.floor(30 + Math.random()*40)}% ${Math.floor(30 + Math.random()*40)}% ${Math.floor(30 + Math.random()*40)}%`
      : undefined;

    const particle: MemoryParticle = {
      id: Date.now(),
      type: color.particleType,
      left: randomXOffset, // Relative to center of the corner container
      bottom: heightBase + randomYOffset,
      rotation: Math.random() * 360,
      scale: 0.8 + Math.random() * 0.4,
      color: color.particleColor,
      borderRadius: borderRadius,
      animationDelay: '0ms'
    };

    this.memoryParticles.update(prev => [...prev, particle]);
  }

  triggerCheckpoint(count: number) {
    let msg = '';
    if (count === 5) msg = "正在把你的烟火气装入信封... (Collecting your sparks...)";
    else if (count === 10) msg = "听起来，那是很温柔的一年。 (Sounds like a gentle year.)";
    else if (count === 15) msg = "那些情绪的碎片，都已妥善安放。 (Fragments safely stored.)";
    
    if (msg) {
      this.checkpointMessage.set(msg);
      this.showCheckpoint.set(true);
      setTimeout(() => {
        this.showCheckpoint.set(false);
      }, 3000); 
    }
  }

  handleBack() {
    if (this.currentStep() > 0) {
      this.currentStep.update(i => i - 1);
      this.currentInspiration.set(null);
    }
  }

  async finishAndAnalyze() {
    this.viewState.set('loading');
    
    try {
      const colorContext = this.selectedColor()?.aiContext || "Neutral";
      // This sends ONLY the current 'answers' signal to AI. 
      // Since we reset answers in 'resetJourney', this is safe.
      const response = await this.geminiService.generateYearReview(this.answers(), colorContext);
      const text = response.text || '{}';
      const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
      
      const data = JSON.parse(jsonStr) as AnalysisResult;
      this.analysisResult.set(data);
      
      // Initialize Chat history with ONLY current answers
      this.chatHistory.set([
        { role: 'user', parts: JSON.stringify(this.answers()) },
        { role: 'model', parts: "我已小心珍藏你的记忆。让我们开始对话吧。(I have stored your memories gently. Let us reflect.)" }
      ]);
      
      this.viewState.set('results');
    } catch (err) {
      console.error('Failed to analyze', err);
      alert('连接记忆库中断，请重试。(Connection interrupted, please try again.)');
      this.viewState.set('questions'); 
    }
  }

  async sendChatMessage() {
    const msg = this.chatInput().trim();
    if (!msg) return;

    const oldHistory = this.chatHistory();
    this.chatHistory.set([...oldHistory, { role: 'user', parts: msg }]);
    this.chatInput.set('');
    this.isChatLoading.set(true);

    try {
      const response = await this.geminiService.chatWithYear(oldHistory, msg);
      this.chatHistory.update(h => [...h, { role: 'model', parts: response }]);
    } catch (e) {
      console.error(e);
    } finally {
      this.isChatLoading.set(false);
    }
  }

  getAnswerFor(qId: string): string {
    return this.answers()[qId] || '';
  }

  async generateReport() {
    if (!this.reportNode) return;
    this.isGeneratingReport.set(true);
    
    // Small delay to ensure render
    setTimeout(async () => {
      try {
        const canvas = await html2canvas(this.reportNode.nativeElement, {
          scale: 2, // High resolution
          useCORS: true,
          backgroundColor: '#F2F0E9'
        });
        
        this.generatedReportUrl.set(canvas.toDataURL('image/png'));
      } catch (e) {
        console.error("Report generation failed", e);
        alert("无法生成图片，请重试 (Cannot generate image)");
      } finally {
        this.isGeneratingReport.set(false);
      }
    }, 100);
  }

  closeReportModal() {
    this.generatedReportUrl.set(null);
  }

  downloadReport() {
    const url = this.generatedReportUrl();
    if (!url) return;
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `2025_Memory_Capsule_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
