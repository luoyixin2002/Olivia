
import { Component, input, output, signal, effect, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface Question {
  id: string;
  category: string;
  textZh: string;
  textEn: string;
  placeholder?: string;
}

@Component({
  selector: 'app-question-card',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="w-full max-w-2xl mx-auto p-8 md:p-12 bg-morandi-card/80 backdrop-blur-md border border-morandi-sand rounded-xl shadow-lg transition-all duration-500 relative overflow-hidden">
      
      <!-- Decorative background element -->
      <div class="absolute -top-10 -right-10 w-32 h-32 bg-morandi-sage/10 rounded-full blur-2xl pointer-events-none"></div>

      <!-- Category Badge -->
      <div class="mb-8 flex justify-between items-center relative z-10">
        <span class="px-4 py-1.5 text-xs font-semibold tracking-widest text-morandi-text/70 bg-morandi-bg rounded-md uppercase">
          {{ question().category }}
        </span>
        <span class="text-morandi-accent font-serif italic text-lg">
          {{ currentIndex() + 1 }} <span class="text-sm not-italic text-gray-300">/</span> {{ total() }}
        </span>
      </div>

      <!-- Question Text with Typewriter Effect -->
      <div class="mb-8 relative z-10 min-h-[100px]">
        <h2 class="text-2xl md:text-3xl font-serif font-bold text-morandi-dark mb-3 leading-relaxed tracking-wide">
          <span class="typing-cursor">{{ displayedText() }}</span>
        </h2>
        <p class="text-base md:text-lg text-morandi-text/60 font-serif italic leading-relaxed fade-in" [style.animation-delay]="'500ms'">
          {{ question().textEn }}
        </p>
      </div>

      <!-- Input Area -->
      <div class="relative group mb-2">
        <textarea 
          #inputRef
          [value]="currentAnswer()"
          (input)="onInput(inputRef.value)"
          [placeholder]="question().placeholder || '别担心字数，哪怕只是一个名字，我也能读懂。'"
          class="w-full bg-morandi-bg/50 text-morandi-dark border border-morandi-sand focus:border-morandi-accent outline-none p-6 min-h-[160px] text-lg transition-all duration-300 resize-none rounded-lg focus:bg-white focus:shadow-sm placeholder-gray-400 font-serif leading-relaxed"
          (keydown.control.enter)="submit()"
        ></textarea>
        
        <!-- Inspiration Button -->
        <div class="absolute bottom-4 right-4 z-20">
             <button 
               (click)="requestInspiration.emit()"
               [disabled]="isGettingInspiration()"
               class="flex items-center gap-2 text-xs font-medium text-morandi-accent hover:text-morandi-dusty transition-colors bg-white/80 backdrop-blur px-3 py-1.5 rounded-full border border-morandi-sand/50 shadow-sm hover:shadow-md"
               title="See answer examples"
             >
               @if (isGettingInspiration()) {
                 <span class="animate-spin text-lg">✦</span>
               } @else {
                 <span class="text-lg">✦</span>
               }
               <span>灵感范例 (Examples)</span>
             </button>
        </div>
      </div>
      
      <!-- Input Guidance -->
      <div class="mb-6 text-right">
        <span class="text-xs text-morandi-text/40 tracking-wider">
          * 任何细微的感受都值得被记录 (Every subtle feeling is worth recording)
        </span>
      </div>

      <!-- Inspiration Hint Display -->
      @if (inspirationHint()) {
        <div class="mb-8 p-4 bg-morandi-sage/10 border-l-2 border-morandi-sage rounded-r-lg text-morandi-text text-sm italic font-serif animate-pulse whitespace-pre-line">
          {{ inspirationHint() }}
        </div>
      }

      <!-- Navigation Actions -->
      <div class="flex justify-between items-center mt-8">
        <button 
          (click)="back.emit()"
          [disabled]="currentIndex() === 0"
          class="text-morandi-text/50 hover:text-morandi-dark transition-colors disabled:opacity-0 px-4 py-2 font-medium text-sm tracking-wide flex items-center gap-1"
        >
          <span>&larr;</span> 上一题 (Back)
        </button>

        <button 
          (click)="submit()"
          [disabled]="!currentAnswer()"
          class="bg-morandi-dark hover:bg-morandi-accent text-white font-medium py-3 px-10 rounded-lg transition-all transform hover:-translate-y-0.5 disabled:opacity-30 disabled:cursor-not-allowed shadow-md hover:shadow-lg text-sm tracking-widest uppercase"
        >
          {{ isLast() ? '封存胶囊 (Seal)' : '下一题 (Next)' }}
        </button>
      </div>
    </div>
  `
})
export class QuestionCardComponent implements OnDestroy {
  question = input.required<Question>();
  currentIndex = input.required<number>();
  total = input.required<number>();
  initialAnswer = input<string>('');
  
  // Inspiration props
  inspirationHint = input<string | null>(null);
  isGettingInspiration = input<boolean>(false);
  
  next = output<string>();
  back = output<void>();
  requestInspiration = output<void>();

  // Local state for the input to handle current typing
  currentAnswer = signal('');
  
  // Typewriter state
  displayedText = signal('');
  private typeInterval: any;

  constructor() {
    effect(() => {
      // Track dependencies
      const q = this.question();
      const initAns = this.initialAnswer();

      // Reset displayed text for typewriter
      this.displayedText.set(''); 
      
      // Update local answer state from input prop
      this.currentAnswer.set(initAns || '');

      // Small delay to ensure clean state before starting typewriter
      if (this.typeInterval) clearInterval(this.typeInterval);
      setTimeout(() => {
         this.typeWriterEffect(q.textZh);
      }, 50);
    });
  }

  ngOnDestroy() {
    if (this.typeInterval) clearInterval(this.typeInterval);
  }

  typeWriterEffect(fullText: string) {
    if (this.typeInterval) clearInterval(this.typeInterval);
    
    let index = 0;
    
    // 50ms for smooth visual typing
    this.typeInterval = setInterval(() => {
      if (index < fullText.length) {
        this.displayedText.update(t => t + fullText.charAt(index));
        index++;
      } else {
        clearInterval(this.typeInterval);
      }
    }, 50); 
  }

  onInput(val: string) {
    this.currentAnswer.set(val);
  }

  submit() {
    if (this.currentAnswer().trim()) {
      this.next.emit(this.currentAnswer());
    }
  }
  
  isLast() {
    return this.currentIndex() === this.total() - 1;
  }
}
