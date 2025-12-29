
import { Component, signal, inject, computed, ElementRef, ViewChild, OnDestroy, ChangeDetectionStrategy, OnInit } from '@angular/core';
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
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, QuestionCardComponent, JellyCapsuleDirective],
  template: `
<div class="min-h-screen w-full relative overflow-x-hidden flex flex-col items-center justify-center p-6 bg-morandi-bg text-morandi-text">
  
  <!-- LIQUID CAPSULE BACKGROUND -->
  <div class="absolute inset-0 z-0 overflow-hidden pointer-events-none">
    <!-- Capsule 1 -->
    <div appJellyCapsule [stiffness]="0.04" [damping]="0.85" 
         class="capsule-bg w-[300px] h-[300px] top-[10%] left-[10%] pointer-events-auto" style="--liquid-color: #E6D5B8;">
       <div class="capsule-liquid"></div>
    </div>
    <!-- Capsule 2 -->
    <div appJellyCapsule [stiffness]="0.03" [damping]="0.9" [mass]="1.2"
         class="capsule-bg w-[400px] h-[400px] top-[40%] right-[-50px] pointer-events-auto" style="--liquid-color: #A6B08E;">
       <div class="capsule-liquid" style="animation-direction: reverse;"></div>
    </div>
    <!-- Capsule 3 -->
    <div appJellyCapsule [stiffness]="0.05" [damping]="0.8"
         class="capsule-bg w-[250px] h-[250px] bottom-[-50px] left-[20%] pointer-events-auto" style="--liquid-color: #D6A692;">
       <div class="capsule-liquid"></div>
    </div>
  </div>

  <!-- FLOATING MUSIC PLAYER (Top Right) -->
  <div class="fixed top-6 right-6 z-50 flex flex-col items-end gap-2 fade-in">
     <div class="flex items-center gap-2">
       <!-- Local File Input (Hidden) -->
       <input type="file" #bgmInput (change)="onBgmFileSelected($event)" accept="audio/*" class="hidden">
       
       <!-- Upload/Change Button (Small Text) -->
       <button (click)="bgmInput.click()" 
               class="bg-white/50 backdrop-blur text-morandi-dark hover:bg-white p-2 rounded-full shadow-sm transition-all border border-morandi-sand"
               title="Select Local BGM">
          <span class="text-[10px] uppercase font-bold tracking-wider px-1">
             {{ hasAudioSource() ? '♪ Change' : '♪ Upload' }}
          </span>
       </button>

       <!-- Play/Pause Button (Disc Style) -->
       <button (click)="toggleAudio()" 
               class="w-10 h-10 rounded-full border-2 flex items-center justify-center bg-white/30 backdrop-blur shadow-md hover:scale-105 transition-transform relative overflow-hidden group"
               [class.border-morandi-dark]="hasAudioSource()"
               [class.border-morandi-red]="!hasAudioSource()"
               [class.border-opacity-20]="hasAudioSource()"
               [class.border-opacity-50]="!hasAudioSource()"
               >
          
          @if(hasAudioSource()) {
             <!-- Disc Graphic (Playing) -->
            <div class="absolute inset-0 rounded-full bg-morandi-dark" 
                 [class.animate-spin-slow]="isAudioPlaying()"
                 [style.animation-play-state]="isAudioPlaying() ? 'running' : 'paused'">
                 <!-- Inner Label -->
                 <div class="absolute top-1/2 left-1/2 w-4 h-4 bg-morandi-bg rounded-full -translate-x-1/2 -translate-y-1/2 border border-morandi-dark/50"></div>
            </div>
            
            <!-- Icon Overlay -->
            <div class="relative z-10 text-morandi-bg">
               @if(isAudioPlaying()) {
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4">
                   <path fill-rule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H7.5a.75.75 0 0 1-.75-.75V5.25Zm7.5 0A.75.75 0 0 1 15 4.5h1.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H15a.75.75 0 0 1-.75-.75V5.25Z" clip-rule="evenodd" />
                 </svg>
               } @else {
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4 ml-0.5">
                   <path fill-rule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clip-rule="evenodd" />
                 </svg>
               }
            </div>
          } @else {
             <!-- Missing State (Upload Prompt) -->
             <div class="absolute inset-0 bg-white/50 flex items-center justify-center">
                 <span class="text-morandi-red text-lg font-bold animate-pulse">+</span>
             </div>
          }
       </button>
     </div>
  </div>

  <main class="relative z-10 w-full max-w-5xl flex flex-col items-center pointer-events-none">
    <!-- Header (Minimalist) -->
    <header class="absolute top-0 left-0 w-full flex justify-center py-8 pointer-events-none">
      <div class="flex flex-col items-center gap-2">
         <span class="text-[10px] md:text-xs tracking-[0.4em] uppercase text-morandi-text/40 font-sans">Project 2025</span>
      </div>
    </header>

    <!-- INTRO VIEW -->
    @if (viewState() === 'intro') {
      <div class="text-center fade-in max-w-2xl mx-auto py-12 md:py-20 relative z-10 flex flex-col items-center pointer-events-auto">
        
        <!-- Minimalist Vertical Line Decoration -->
        <div class="w-px h-12 md:h-20 bg-morandi-dark/20 mb-10"></div>
        
        <!-- Main Title -->
        <h1 class="text-3xl md:text-5xl lg:text-6xl font-serif text-morandi-dark mb-6 leading-tight tracking-[0.15em] font-medium text-shadow-sm">
          封存你的<br class="md:hidden" />2025年记忆
        </h1>
        
        <!-- English Subtitle (Small & Wide) -->
        <p class="text-[10px] md:text-xs font-sans uppercase tracking-[0.4em] text-morandi-text/50 mb-12 md:mb-16">
          Seal Your 2025 Memories
        </p>

        <!-- Poetic Intro Text -->
        <div class="text-morandi-text text-sm md:text-base leading-loose font-serif font-light opacity-80 mb-16 max-w-md mx-auto space-y-2">
          <p>岁月无声，落笔有痕。</p>
          <p>在2025消逝之前，用20个提问打捞那些珍贵的瞬间。</p>
        </div>
        
        <!-- Action Button (Minimalist Arrow) -->
        <button (click)="startJourney()" class="group relative flex flex-col items-center gap-4 focus:outline-none" aria-label="Start Journey">
           <!-- Circle container -->
           <div class="w-16 h-16 md:w-20 md:h-20 rounded-full border border-morandi-dark/40 flex items-center justify-center transition-all duration-500 ease-out group-hover:bg-morandi-dark group-hover:border-morandi-dark group-hover:scale-105 group-hover:shadow-lg backdrop-blur-sm">
              <!-- Arrow Icon -->
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.2" stroke="currentColor" 
                   class="w-6 h-6 md:w-8 md:h-8 text-morandi-dark transition-colors duration-500 group-hover:text-white transform group-hover:translate-x-1">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
           </div>
           
           <!-- Subtle Label -->
           <span class="text-[10px] tracking-[0.3em] uppercase text-morandi-dark/40 group-hover:text-morandi-dark transition-colors duration-500">Enter</span>
        </button>
      </div>
    }

    <!-- COLOR SELECTION VIEW -->
    @if (viewState() === 'color-selection') {
      <div class="w-full max-w-3xl flex flex-col items-center fade-in py-10 pointer-events-auto">
        <h2 class="text-xl md:text-2xl font-serif text-morandi-dark mb-2 tracking-widest">定义你的 2025 底色</h2>
        <p class="text-xs uppercase tracking-[0.2em] text-morandi-text/50 mb-12">Define Your Year's Tone</p>
        
        <div class="grid grid-cols-2 md:grid-cols-5 gap-6 mb-16">
          @for (color of colorOptions; track color.id) {
            <div class="flex flex-col items-center gap-3 cursor-pointer group" (click)="confirmColor(color)">
               <!-- Color Circle -->
               <div class="w-20 h-20 md:w-24 md:h-24 rounded-full shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:shadow-xl relative border-2 border-white/50"
                    [class]="color.previewClass">
                    
                    <!-- Selection Ring (if needed, but simple hover is nice) -->
                    <div class="absolute inset-[-4px] rounded-full border border-morandi-dark/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
               </div>
               
               <!-- Name -->
               <span class="text-sm font-serif font-medium text-morandi-dark mt-2">{{ color.name }}</span>
               
               <!-- Desc (Visible on hover or mobile always) -->
               <p class="text-[10px] text-morandi-text/60 text-center w-24 leading-relaxed opacity-60 group-hover:opacity-100 transition-opacity">
                 {{ color.desc }}
               </p>
            </div>
          }
        </div>
        
        <p class="text-xs text-morandi-text/40 italic">这抹颜色将成为我们为你写信的笔触</p>
      </div>
    }

    <!-- UNLOCK VIEW (Interactive Capsule) -->
    @if (viewState() === 'unlocking') {
      <div class="flex flex-col items-center justify-center relative fade-in w-full h-[60vh] pointer-events-auto">
        
        <!-- Exquisite Capsule Container -->
        <div 
           class="relative w-24 h-56 cursor-pointer select-none"
           (mousedown)="startUnlock()" (touchstart)="startUnlock()"
           (mouseup)="endUnlock()" (touchend)="endUnlock()" (mouseleave)="endUnlock()"
           [class.shake-gentle]="isUnlocking()"
        >
          <!-- Progress Glow/Aura -->
          <div class="absolute inset-[-20px] rounded-full border border-morandi-accent/30 transition-all duration-300"
               [style.opacity]="isUnlocking() ? 1 : 0"
               [style.transform]="'scale(' + (1 + unlockProgress()/100) + ')'"></div>
          
          <!-- Capsule Top Half (Lid) -->
          <div class="absolute top-0 w-full h-[52%] rounded-t-full z-20 border-b border-white/20 shadow-lg transition-transform duration-700"
               [style.background]="selectedColor()?.capsuleTop"
               [class.capsule-open-top]="unlockProgress() >= 100">
             <!-- Metallic shine -->
             <div class="absolute top-4 left-4 w-3 h-12 bg-white/10 rounded-full blur-[1px]"></div>
          </div>
          
          <!-- Capsule Bottom Half (Body) -->
          <div class="absolute bottom-0 w-full h-[48%] rounded-b-full z-20 shadow-lg flex items-center justify-center transition-transform duration-700"
               [style.background]="selectedColor()?.capsuleBottom"
               [class.capsule-open-bottom]="unlockProgress() >= 100">
             
             <!-- Fingerprint / Press Area -->
             <div class="relative w-12 h-16 border border-white/10 rounded-full flex items-center justify-center overflow-hidden">
                <div class="text-white/30 text-2xl">
                   @if (unlockProgress() >= 100) {
                     <span class="text-morandi-sand">✦</span>
                   } @else {
                     <span>⌶</span>
                   }
                </div>
                <!-- Fill Animation -->
                <div class="absolute bottom-0 left-0 w-full bg-morandi-accent/40 transition-all duration-100 ease-linear"
                     [style.height.%]="unlockProgress()"></div>
             </div>
          </div>
          
          <!-- Inner Glow (Visible when splitting) -->
          <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-40 bg-white/80 blur-xl z-10 opacity-0 transition-opacity duration-500"
              [class.opacity-100]="unlockProgress() >= 100"></div>

        </div>

        <div class="mt-12 text-center transition-opacity duration-300" [style.opacity]="unlockProgress() >= 100 ? 0 : 1">
           <p class="text-xs uppercase tracking-[0.3em] text-morandi-text/60 mb-2">Long Press to Unlock</p>
           <p class="font-serif text-morandi-dark text-lg italic">长按解锁记忆</p>
        </div>

      </div>
    }

    <!-- QUESTIONS VIEW -->
    @if (viewState() === 'questions') {
      <!-- Z-index 20 to ensure card is ABOVE the particles -->
      <div class="w-full flex flex-col items-center relative pt-10 fade-in z-20 pointer-events-auto">
        <!-- Progress Bar -->
        <div class="w-full max-w-2xl h-0.5 bg-morandi-dark/10 rounded-full mb-12 overflow-hidden">
          <div class="h-full bg-morandi-dark/60 transition-all duration-700 ease-out" [style.width.%]="progress()"></div>
        </div>
        
        <app-question-card 
          [question]="currentQuestion()"
          [currentIndex]="currentStep()"
          [total]="questions.length"
          [initialAnswer]="getAnswerFor(currentQuestion().id)"
          [inspirationHint]="currentInspiration()"
          [isGettingInspiration]="isGettingInspiration()"
          (next)="handleAnswer($event)"
          (back)="handleBack()"
          (requestInspiration)="getInspiration()"
        ></app-question-card>

        <!-- Checkpoint Toast -->
        @if (showCheckpoint()) {
          <div class="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 fade-in">
             <div class="bg-white/90 backdrop-blur border border-morandi-sand text-morandi-dark px-8 py-4 rounded-sm shadow-xl flex flex-col items-center gap-2 min-w-[300px]">
               <span class="text-xl text-morandi-accent">✦</span>
               <span class="text-sm font-serif tracking-widest text-center">{{ checkpointMessage() }}</span>
             </div>
          </div>
        }
      </div>

      <!-- MEMORY PARTICLE PILE -->
      <div class="fixed right-4 bottom-4 pointer-events-none z-0 w-[150px] md:w-[300px] h-[300px] flex justify-center items-end">
        <div class="relative w-full h-full">
          @for (particle of memoryParticles(); track particle.id) {
              <!-- STONE -->
              @if (particle.type === 'stone') {
                <div class="absolute shadow-sm particle-drop"
                    [style.left.%]="50" 
                    [style.marginLeft.px]="particle.left"
                    [style.bottom.px]="particle.bottom"
                    [style.width.px]="25 * particle.scale"
                    [style.height.px]="20 * particle.scale"
                    [style.background-color]="particle.color"
                    [style.border-radius]="particle.borderRadius"
                    [style.transform]="'rotate(' + particle.rotation + 'deg)'"
                ></div>
              }
              <!-- FEATHER -->
              @if (particle.type === 'feather') {
                <svg class="absolute particle-float opacity-80"
                      viewBox="0 0 24 24" fill="currentColor"
                      [style.left.%]="50" 
                      [style.marginLeft.px]="particle.left"
                      [style.bottom.px]="particle.bottom"
                      [style.width.px]="30 * particle.scale"
                      [style.height.px]="30 * particle.scale"
                      [style.color]="particle.color"
                      [style.transform]="'rotate(' + particle.rotation + 'deg)'">
                      <path d="M12 2C6 2 2 8 2 12c0 4 4 9 10 10 6 0 10-5 10-9 0-4-4-10-10-11z" />
                      <line x1="12" y1="2" x2="12" y2="22" stroke="currentColor" stroke-width="1" stroke-opacity="0.5" />
                </svg>
              }
          }
        </div>
      </div>
    }

    <!-- LOADING VIEW -->
    @if (viewState() === 'loading') {
      <div class="flex flex-col items-center justify-center text-center fade-in py-20 pointer-events-auto">
        <div class="w-16 h-16 border-t-2 border-b-2 border-morandi-dark/30 rounded-full animate-spin mb-8"></div>
        <h3 class="text-xl md:text-2xl font-serif text-morandi-dark mb-4 tracking-widest">正在打捞记忆...</h3>
        <p class="text-xs font-sans uppercase tracking-[0.2em] text-morandi-text/40">Weaving your story</p>
      </div>
    }

    <!-- RESULTS VIEW -->
    @if (viewState() === 'results' && analysisResult()) {
      <div class="w-full fade-in pb-20 pt-8 pointer-events-auto">
        
        <!-- Action Bar -->
        <div class="flex justify-between items-center mb-8 px-2 md:px-0">
           <!-- Restart Button -->
           <button (click)="resetJourney()" class="text-morandi-text/60 hover:text-morandi-dark text-xs uppercase tracking-widest transition-colors flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              New Journey
           </button>

           <button (click)="generateReport()" [disabled]="isGeneratingReport()" class="bg-morandi-dark text-white px-8 py-3 rounded-sm text-xs uppercase tracking-widest hover:bg-morandi-accent transition-colors flex items-center gap-2 shadow-sm">
             @if(isGeneratingReport()) {
                <span class="animate-spin">⟳</span>
             } @else {
                <span>SAVE MEMORY</span>
             }
           </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-16">
          
          <!-- LEFT COLUMN: Letter -->
          <div class="md:col-span-7 paper-texture bg-[#F9F7F2] p-10 md:p-16 shadow-sm border-t-4 border-morandi-dark/80 relative overflow-hidden">
             
             <!-- CAPSULE WATERMARK -->
             <div class="absolute top-10 right-10 w-32 h-64 opacity-[0.08] pointer-events-none blur-md mix-blend-multiply rotate-12">
                <div class="w-full h-[52%] rounded-t-full" [style.background]="selectedColor()?.capsuleTop"></div>
                <div class="w-full h-[48%] rounded-b-full" [style.background]="selectedColor()?.capsuleBottom"></div>
             </div>

             <div class="text-center mb-12 relative z-10">
               <span class="block text-[10px] uppercase tracking-[0.3em] text-morandi-text/40 mb-4">The Letter</span>
               <h2 class="text-2xl md:text-3xl font-serif text-morandi-dark font-bold tracking-wide">{{ analysisResult()!.letterTitle }}</h2>
             </div>
            
            <article class="font-serif text-morandi-text opacity-90 relative z-10">
              @for (para of letterParagraphs(); track $index) {
                <p class="indent-[2em] mb-4 text-justify leading-loose whitespace-pre-wrap">{{ para }}</p>
              }
            </article>
            
             <div class="flex justify-end mt-16 opacity-90 relative z-10">
                <div class="w-40 h-40 flex items-center justify-center relative rotate-[-6deg] opacity-80 mix-blend-multiply text-morandi-red">
                   <!-- Texture/Roughness -->
                   <div class="absolute inset-0 rounded-full border-[3px] border-morandi-red/40 border-dashed opacity-50"></div>
                   
                   <svg viewBox="0 0 200 200" class="w-full h-full p-2" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M100 20 C 102 40 110 45 120 48 C 110 51 102 56 100 76 C 98 56 90 51 80 48 C 90 45 98 40 100 20 Z" />
                      <path d="M100 130 C 103 150 115 155 130 158 C 115 161 103 166 100 186 C 97 166 85 161 70 158 C 85 155 97 150 100 130 Z" />
                      <path d="M50 60 C 51 65 55 67 60 68 C 55 69 51 71 50 76 C 49 71 45 69 40 68 C 45 67 49 65 50 60 Z" />
                      <path d="M150 50 C 151 55 155 57 160 58 C 155 59 151 61 150 66 C 149 61 145 59 140 58 C 145 57 149 55 150 50 Z" />
                      <circle cx="80" cy="80" r="1.5" fill="currentColor" stroke="none" />
                      <circle cx="120" cy="70" r="1.5" fill="currentColor" stroke="none" />
                      <circle cx="160" cy="140" r="1" fill="currentColor" stroke="none" />
                      <circle cx="40" cy="150" r="1" fill="currentColor" stroke="none" />
                      <text x="100" y="115" text-anchor="middle" font-family="'Great Vibes', cursive" font-weight="normal" font-size="55" fill="currentColor" stroke="none">2025</text>
                      <text x="100" y="145" text-anchor="middle" font-family="'Ma Shan Zheng', cursive" font-size="16" fill="currentColor" stroke="none" letter-spacing="2">Memory</text>
                   </svg>
                </div>
             </div>
          </div>

          <!-- RIGHT COLUMN: Stats & Portrait -->
          <div class="md:col-span-5 space-y-10">
            <!-- Keywords Card -->
            <div class="bg-white/50 backdrop-blur-sm p-10 border-l-2 border-morandi-dark/20">
              <h3 class="text-[10px] uppercase tracking-[0.3em] text-morandi-text/40 mb-8">Keywords</h3>
              <div class="space-y-8">
                @for (kw of analysisResult()!.keywords; track kw.word) {
                  <div>
                    <span class="text-3xl font-serif text-morandi-dark block mb-3 tracking-widest">{{ kw.word }}</span>
                    <p class="text-sm text-morandi-text/70 leading-relaxed font-light">{{ kw.explanation }}</p>
                  </div>
                }
              </div>
            </div>

            <!-- Portrait Card -->
            <div class="bg-white/50 backdrop-blur-sm p-10 border-l-2 border-morandi-dark/20">
               <h3 class="text-[10px] uppercase tracking-[0.3em] text-morandi-text/40 mb-8">Portrait</h3>
               <ul class="space-y-10">
                 <li>
                   <span class="block text-xs font-bold text-morandi-dark uppercase tracking-wider mb-2">精神内核 · Core</span>
                   <p class="text-morandi-text leading-relaxed text-sm font-serif">{{ analysisResult()!.portrait.mentalCore }}</p>
                 </li>
                 <li>
                   <span class="block text-xs font-bold text-morandi-dark uppercase tracking-wider mb-2">行动模式 · Action</span>
                   <p class="text-morandi-text leading-relaxed text-sm font-serif">{{ analysisResult()!.portrait.actionPattern }}</p>
                 </li>
                 <li>
                   <span class="block text-xs font-bold text-morandi-dark uppercase tracking-wider mb-2">情感色调 · Tone</span>
                   <p class="text-morandi-text leading-relaxed text-sm font-serif">{{ analysisResult()!.portrait.emotionalTone }}</p>
                 </li>
               </ul>
            </div>
          </div>
        </div>

        <!-- Chat Section -->
        <div class="mt-24 max-w-4xl mx-auto">
          <div class="text-center mb-8">
             <div class="w-px h-10 bg-morandi-dark/20 mx-auto mb-4"></div>
             <h4 class="text-lg font-serif tracking-widest text-morandi-dark">与2025对话</h4>
          </div>
          <div class="bg-white/80 rounded-sm border border-white shadow-sm overflow-hidden">
            <div class="h-72 overflow-y-auto p-8 space-y-8 bg-slate-50/30">
              @for (msg of chatHistory().slice(1); track $index) {
                <div [class.text-right]="msg.role === 'user'" [class.text-left]="msg.role === 'model'">
                   <div class="inline-block max-w-[85%] p-6 rounded-sm text-sm leading-loose shadow-sm font-serif"
                    [class.bg-morandi-dark]="msg.role === 'user'"
                    [class.text-white]="msg.role === 'user'"
                    [class.bg-white]="msg.role === 'model'"
                    [class.text-morandi-text]="msg.role === 'model'"
                   >
                     {{ msg.parts }}
                   </div>
                   <div class="text-[10px] text-morandi-text/30 mt-2 uppercase tracking-widest">
                      {{ msg.role === 'user' ? 'YOU' : '2025' }}
                   </div>
                </div>
              }
            </div>
            
            <div class="p-4 bg-white border-t border-morandi-sand/30 flex gap-0">
              <input 
                 type="text" 
                 [value]="chatInput()"
                 (input)="chatInput.set($any($event.target).value)"
                 (keydown.enter)="sendChatMessage()"
                 placeholder="写下你想说的话..." 
                 class="flex-1 bg-transparent border-none px-6 py-4 text-morandi-dark focus:outline-none font-serif placeholder-morandi-text/30"
              >
              <button (click)="sendChatMessage()" class="bg-morandi-bg text-morandi-dark hover:bg-morandi-sand px-8 py-3 text-xs tracking-widest uppercase transition-colors">
                Send
              </button>
            </div>
          </div>
        </div>

      </div>
    }

    <!-- HIDDEN REPORT NODE FOR GENERATION -->
    <div class="absolute left-[-9999px] top-0 w-[600px] paper-texture bg-[#F9F7F2] p-16 text-morandi-dark font-serif" #reportNode>
       
       <!-- CAPSULE WATERMARK -->
       <div class="absolute top-10 right-10 w-40 h-80 opacity-[0.08] pointer-events-none blur-md mix-blend-multiply rotate-12">
           <div class="w-full h-[52%] rounded-t-full" [style.background]="selectedColor()?.capsuleTop"></div>
           <div class="w-full h-[48%] rounded-b-full" [style.background]="selectedColor()?.capsuleBottom"></div>
       </div>
       
       @if(analysisResult()) {
         <!-- 1. Top: Keywords -->
         <div class="text-center border-b border-morandi-dark/10 pb-12 mb-12 relative z-10">
            <h1 class="text-3xl font-serif text-morandi-dark mb-10 tracking-[0.3em]">二零二五 · 关键词</h1>
            <div class="flex justify-center gap-12">
               @for (kw of analysisResult()!.keywords; track kw.word) {
                  <div class="writing-vertical-rl text-2xl font-bold font-serif text-morandi-dark tracking-[0.2em] border-l border-morandi-dark/20 pl-6 h-40 flex items-center justify-center">
                    {{ kw.word }}
                  </div>
               }
            </div>
         </div>

         <!-- 2. Middle: Portrait -->
         <div class="flex gap-10 mb-16 relative z-10">
            <div class="w-0.5 bg-morandi-dark/10"></div>
            <div class="flex-1 space-y-8">
                <div>
                   <span class="text-[10px] uppercase tracking-[0.3em] text-morandi-text/60 block mb-2">Mental Core</span>
                   <p class="text-sm leading-loose text-justify">{{ analysisResult()!.portrait.mentalCore }}</p>
                </div>
                <div>
                   <span class="text-[10px] uppercase tracking-[0.3em] text-morandi-text/60 block mb-2">Action Pattern</span>
                   <p class="text-sm leading-loose text-justify">{{ analysisResult()!.portrait.actionPattern }}</p>
                </div>
            </div>
         </div>

         <!-- 3. Bottom: Letter & Answers -->
         <div class="bg-white/80 p-12 shadow-sm border border-morandi-dark/5 mb-10 relative z-10">
             <h2 class="text-xl font-serif mb-8 text-center tracking-widest font-bold">{{ analysisResult()!.letterTitle }}</h2>
             <div class="text-sm leading-loose text-justify text-morandi-text/90">
                @for (para of letterParagraphs(); track $index) {
                  <p class="indent-[2em] mb-4 whitespace-pre-wrap">{{ para }}</p>
                }
             </div>
         </div>

         <!-- Footer Seal -->
         <div class="flex justify-between items-end mt-16 pt-8 border-t border-morandi-dark/10 relative z-10">
            <div class="text-[10px] text-morandi-text/40 tracking-[0.3em] uppercase">
               2025 Memory Capsule<br>AI Generated Report
            </div>
            
            <div class="w-40 h-40 flex items-center justify-center relative rotate-[-6deg] opacity-80 mix-blend-multiply text-morandi-red">
               <div class="absolute inset-0 rounded-full border-[3px] border-morandi-red/40 border-dashed opacity-50"></div>
               <svg viewBox="0 0 200 200" class="w-full h-full p-2" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M100 20 C 102 40 110 45 120 48 C 110 51 102 56 100 76 C 98 56 90 51 80 48 C 90 45 98 40 100 20 Z" />
                  <path d="M100 130 C 103 150 115 155 130 158 C 115 161 103 166 100 186 C 97 166 85 161 70 158 C 85 155 97 150 100 130 Z" />
                  <path d="M50 60 C 51 65 55 67 60 68 C 55 69 51 71 50 76 C 49 71 45 69 40 68 C 45 67 49 65 50 60 Z" />
                  <path d="M150 50 C 151 55 155 57 160 58 C 155 59 151 61 150 66 C 149 61 145 59 140 58 C 145 57 149 55 150 50 Z" />
                  <circle cx="80" cy="80" r="1.5" fill="currentColor" stroke="none" />
                  <circle cx="120" cy="70" r="1.5" fill="currentColor" stroke="none" />
                  <circle cx="160" cy="140" r="1" fill="currentColor" stroke="none" />
                  <circle cx="40" cy="150" r="1" fill="currentColor" stroke="none" />
                  <text x="100" y="115" text-anchor="middle" font-family="'Great Vibes', cursive" font-weight="normal" font-size="55" fill="currentColor" stroke="none">2025</text>
                  <text x="100" y="145" text-anchor="middle" font-family="'Ma Shan Zheng', cursive" font-size="16" fill="currentColor" stroke="none" letter-spacing="2">Memory</text>
               </svg>
            </div>
         </div>
       }
    </div>

    <!-- REPORT MODAL -->
    @if(generatedReportUrl()) {
      <div class="fixed inset-0 z-[100] bg-morandi-bg/95 backdrop-blur-md overflow-y-auto fade-in cursor-pointer" (click)="closeReportModal()">
         
         <button (click)="closeReportModal()" class="fixed top-6 right-6 z-[110] bg-white text-morandi-dark hover:bg-morandi-red hover:text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all border border-morandi-sand group">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5 group-hover:rotate-90 transition-transform">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
         </button>

         <div class="flex min-h-full items-center justify-center p-4 md:p-8">
            <div class="bg-white p-2 rounded-sm w-full max-w-xl shadow-2xl relative border border-morandi-sand my-8 cursor-default" (click)="$event.stopPropagation()">
               <img [src]="generatedReportUrl()" class="w-full h-auto rounded-sm block select-none" style="-webkit-touch-callout: default;">
               <div class="mt-4 px-2 pb-2 flex flex-col md:flex-row justify-between items-center gap-4">
                 <div class="text-center md:text-left">
                    <p class="text-[10px] uppercase tracking-widest text-morandi-text/60">
                       <span class="md:hidden">Long Press Image to Save</span>
                       <span class="hidden md:inline">2025 Memory</span>
                    </p>
                    <p class="md:hidden text-xs text-morandi-dark mt-1 font-serif opacity-80">长按图片保存到相册</p>
                 </div>
                 <div class="flex gap-4">
                   <button (click)="downloadReport()" class="hidden md:flex bg-morandi-dark text-white hover:bg-morandi-accent px-6 py-2 rounded-sm text-xs uppercase tracking-widest transition-colors shadow-sm items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M12 12.75l-3 3m0 0 3 3m-3-3h7.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                      </svg>
                      Download
                   </button>
                 </div>
               </div>
            </div>
         </div>
      </div>
    }

  </main>
</div>
`
})
export class AppComponent implements OnInit, OnDestroy {
  // Services
  private geminiService = inject(GeminiService);

  // State
  viewState = signal<'intro' | 'color-selection' | 'unlocking' | 'questions' | 'loading' | 'results'>('intro');
  selectedColor = signal<YearColor | null>(null);
  
  // Data
  colorOptions: YearColor[] = [
    {
      id: 'moss',
      name: '苔藓绿 · Moss',
      desc: '生长与静谧 (Growth & Silence)',
      previewClass: 'bg-[#8FA692]',
      capsuleTop: '#8FA692',
      capsuleBottom: '#7A8F7C',
      aiContext: 'Growth, Nature, Quiet resilience',
      particleType: 'stone',
      particleColor: '#8FA692'
    },
    {
      id: 'clay',
      name: '陶土红 · Clay',
      desc: '温热与在此 (Warmth & Presence)',
      previewClass: 'bg-[#D6A692]',
      capsuleTop: '#D6A692',
      capsuleBottom: '#C49582',
      aiContext: 'Warmth, Earthy, Emotional depth',
      particleType: 'feather',
      particleColor: '#D6A692'
    },
    {
      id: 'ink',
      name: '墨岩灰 · Ink',
      desc: '沉淀与理性 (Wisdom & Logic)',
      previewClass: 'bg-[#6D7578]',
      capsuleTop: '#6D7578',
      capsuleBottom: '#5C6366',
      aiContext: 'Wisdom, Calm, Rational',
      particleType: 'stone',
      particleColor: '#6D7578'
    },
    {
      id: 'cream',
      name: '羊皮卷 · Cream',
      desc: '纯粹与初生 (Purity & Beginning)',
      previewClass: 'bg-[#E6D5B8]',
      capsuleTop: '#E6D5B8',
      capsuleBottom: '#D4C3A3',
      aiContext: 'Purity, Nostalgia, Softness',
      particleType: 'feather',
      particleColor: '#E6D5B8'
    },
    {
      id: 'ocean',
      name: '雾海蓝 · Ocean',
      desc: '自由与深邃 (Freedom & Depth)',
      previewClass: 'bg-[#8E9CA6]',
      capsuleTop: '#8E9CA6',
      capsuleBottom: '#7A8892',
      aiContext: 'Freedom, Depth, Melancholy',
      particleType: 'feather',
      particleColor: '#8E9CA6'
    }
  ];

  questions: Question[] = [
    { id: 'q1', category: 'MOMENT', textZh: '2025年，哪一个瞬间让你觉得“活着真好”？', textEn: 'A moment you felt truly alive.' },
    { id: 'q2', category: 'CHANGE', textZh: '这一年，你身上发生的最大的变化是什么？', textEn: 'The biggest change in yourself.' },
    { id: 'q3', category: 'REGRET', textZh: '如果时间倒流，哪件事你会换个做法？', textEn: 'What would you do differently?' },
    { id: 'q4', category: 'PERSON', textZh: '谁是你今年最想感谢的人？为什么？', textEn: 'Who are you most grateful for?' },
    { id: 'q5', category: 'LOSS', textZh: '今年你失去了什么？（也许是某个人，也许是某种执念）', textEn: 'What did you lose this year?' },
    { id: 'q6', category: 'GAIN', textZh: '今年最意外的收获是什么？', textEn: 'The most unexpected gain.' },
    { id: 'q7', category: 'CHALLENGE', textZh: '最艰难的时刻你是怎么度过的？', textEn: 'How did you survive the hardest time?' },
    { id: 'q8', category: 'HABIT', textZh: '你养成（或戒掉）了什么习惯？', textEn: 'A habit formed or broken.' },
    { id: 'q9', category: 'PLACE', textZh: '今年去过最难忘的地方是哪里？', textEn: 'Most memorable place visited.' },
    { id: 'q10', category: 'ITEM', textZh: '买过最值得的一样东西是什么？', textEn: 'The best purchase you made.' },
    { id: 'q11', category: 'JOY', textZh: '现在想起来还会忍不住微笑的一件事？', textEn: 'A memory that makes you smile.' },
    { id: 'q12', category: 'TEARS', textZh: '上一次哭是因为什么？', textEn: 'The last time you cried.' },
    { id: 'q13', category: 'FEAR', textZh: '今年你曾害怕面对什么？后来呢？', textEn: 'What did you fear, and what happened?' },
    { id: 'q14', category: 'PRIDE', textZh: '今年最让你自豪的成就是什么？', textEn: 'Your proudest achievement.' },
    { id: 'q15', category: 'SOUND', textZh: '如果2025年是一首歌，它会是什么？', textEn: 'The song of your 2025.' },
    { id: 'q16', category: 'INSIGHT', textZh: '今年明白的一个最重要的道理？', textEn: 'Most important lesson learned.' },
    { id: 'q17', category: 'FORGIVENESS', textZh: '这一年，你原谅了谁（或者原谅了自己吗）？', textEn: 'Who did you forgive?' },
    { id: 'q18', category: 'FAREWELL', textZh: '此时此刻，你想对2025说的一句话？', textEn: 'One sentence to say goodbye to 2025.' },
    { id: 'q19', category: 'HOPE', textZh: '对2026年，你有什么不敢说出口的期待？', textEn: 'A secret hope for 2026.' },
    { id: 'q20', category: 'KEYWORD', textZh: '最后，用一个词形容你的2025。', textEn: 'One word to describe your year.' }
  ];

  // Logic State
  currentStep = signal(0);
  answers = signal<Record<string, string>>({});
  
  currentQuestion = computed(() => this.questions[this.currentStep()]);
  progress = computed(() => ((this.currentStep() + 1) / this.questions.length) * 100);

  // Unlocking Logic
  unlockProgress = signal(0);
  isUnlocking = signal(false);
  private unlockInterval: any;

  // Inspiration
  currentInspiration = signal<string | null>(null);
  isGettingInspiration = signal(false);

  // Checkpoint Toast
  showCheckpoint = signal(false);
  checkpointMessage = signal('');

  // Memory Particles
  memoryParticles = signal<MemoryParticle[]>([]);

  // Results
  analysisResult = signal<AnalysisResult | null>(null);
  letterParagraphs = computed(() => this.analysisResult()?.letterBody.split('\n').filter(p => p.trim()) || []);

  // Chat
  chatHistory = signal<{role: string, parts: string}[]>([]);
  chatInput = signal('');

  // Report
  generatedReportUrl = signal<string | null>(null);
  isGeneratingReport = signal(false);
  @ViewChild('reportNode') reportNode!: ElementRef;

  // Audio
  audio: HTMLAudioElement | undefined;
  isAudioPlaying = signal(false);
  hasAudioSource = signal(false);

  ngOnInit() {
    // SSR Check: Only init Audio in browser environment
    if (typeof window !== 'undefined') {
      this.audio = new Audio();
      this.audio.loop = true;
      this.audio.volume = 0.5;
    }
  }

  ngOnDestroy() {
    if (this.unlockInterval) clearInterval(this.unlockInterval);
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
    }
  }

  // --- Audio ---
  onBgmFileSelected(event: any) {
    if (!this.audio) return;
    const file = event.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      this.audio.src = url;
      this.hasAudioSource.set(true);
      this.audio.play().catch(e => console.error('Audio play failed', e));
      this.isAudioPlaying.set(true);
    }
  }

  toggleAudio() {
    if (!this.hasAudioSource() || !this.audio) return;
    
    if (this.audio.paused) {
      this.audio.play().catch(e => console.error('Audio play failed', e));
      this.isAudioPlaying.set(true);
    } else {
      this.audio.pause();
      this.isAudioPlaying.set(false);
    }
  }

  // --- Flow ---
  startJourney() {
    this.viewState.set('color-selection');
  }

  confirmColor(color: YearColor) {
    this.selectedColor.set(color);
    this.viewState.set('unlocking');
  }

  // --- Unlocking ---
  startUnlock() {
    this.isUnlocking.set(true);
    if (this.unlockInterval) clearInterval(this.unlockInterval);
    
    this.unlockInterval = setInterval(() => {
       this.unlockProgress.update(p => {
         if (p >= 100) return 100;
         return p + 2; // Speed of unlock
       });
    }, 20);
  }

  endUnlock() {
    this.isUnlocking.set(false);
    clearInterval(this.unlockInterval);
    
    if (this.unlockProgress() >= 100) {
       // Success
       setTimeout(() => {
         this.viewState.set('questions');
       }, 500);
    } else {
      // Reset
      const decay = setInterval(() => {
         this.unlockProgress.update(p => {
            if (p <= 0) {
              clearInterval(decay);
              return 0;
            }
            return p - 5;
         });
      }, 10);
    }
  }

  // --- Questions ---
  handleAnswer(answer: string) {
    const qId = this.currentQuestion().id;
    this.answers.update(a => ({ ...a, [qId]: answer }));
    
    // Add Particle
    this.addParticle();

    // Checkpoint Feedback (e.g., every 5 questions)
    if ((this.currentStep() + 1) % 5 === 0) {
      this.showToast(`已封存 ${this.currentStep() + 1} 个记忆碎片...`);
    }

    if (this.currentStep() < this.questions.length - 1) {
      this.currentStep.update(s => s + 1);
      this.currentInspiration.set(null); // Clear hint
    } else {
      this.finishJourney();
    }
  }

  handleBack() {
    if (this.currentStep() > 0) {
      this.currentStep.update(s => s - 1);
      this.currentInspiration.set(null);
    }
  }

  getAnswerFor(id: string) {
    return this.answers()[id];
  }

  async getInspiration() {
    this.isGettingInspiration.set(true);
    try {
      const hint = await this.geminiService.generateInspiration(this.currentQuestion().textZh);
      this.currentInspiration.set(hint);
    } finally {
      this.isGettingInspiration.set(false);
    }
  }

  showToast(msg: string) {
    this.checkpointMessage.set(msg);
    this.showCheckpoint.set(true);
    setTimeout(() => this.showCheckpoint.set(false), 3000);
  }

  addParticle() {
    const color = this.selectedColor();
    if (!color) return;

    const newParticle: MemoryParticle = {
      id: Date.now(),
      type: color.particleType,
      color: color.particleColor,
      left: Math.random() * 80 - 40, // offset from center
      bottom: 0,
      rotation: Math.random() * 360,
      scale: 0.5 + Math.random() * 0.5,
      animationDelay: `-${Math.random() * 2}s`,
      borderRadius: color.particleType === 'stone' 
         ? `${30 + Math.random() * 40}% ${30 + Math.random() * 40}% ${30 + Math.random() * 40}% ${30 + Math.random() * 40}%`
         : undefined
    };

    this.memoryParticles.update(ps => [...ps, newParticle]);
  }

  // --- Analysis ---
  async finishJourney() {
    this.viewState.set('loading');
    
    try {
      const result = await this.geminiService.generateYearReview(
        this.answers(), 
        this.selectedColor()?.aiContext || 'Unknown'
      );
      
      const parsed = JSON.parse(result.text);
      this.analysisResult.set(parsed);
      
      // Init chat
      this.chatHistory.set([
        // Hidden context message if needed, or just dummy to satisfy slice(1) in template
        { role: 'system', parts: 'Init' }, 
        { role: 'model', parts: '你好，我是你的2025。请问你想聊些什么？' }
      ]);

      this.viewState.set('results');

    } catch (e) {
      console.error(e);
      alert('生成失败，请重试');
      this.viewState.set('questions');
    }
  }

  async sendChatMessage() {
    const txt = this.chatInput().trim();
    if (!txt) return;

    this.chatHistory.update(h => [...h, { role: 'user', parts: txt }]);
    this.chatInput.set('');

    try {
      const response = await this.geminiService.chatWithYear(this.chatHistory(), txt);
      this.chatHistory.update(h => [...h, { role: 'model', parts: response }]);
    } catch (e) {
      console.error(e);
    }
  }

  resetJourney() {
    if (confirm('确定要重新开始吗？当前的记忆将不会保存。')) {
       window.location.reload();
    }
  }

  // --- Report ---
  generateReport() {
    this.isGeneratingReport.set(true);
    
    setTimeout(() => {
      // Use html2canvas from global if available
      if (typeof html2canvas !== 'undefined' && this.reportNode) {
         html2canvas(this.reportNode.nativeElement, {
            scale: 2, // Retina
            backgroundColor: '#F9F7F2',
            useCORS: true
         }).then((canvas: any) => {
            const url = canvas.toDataURL('image/png');
            this.generatedReportUrl.set(url);
            this.isGeneratingReport.set(false);
         }).catch((err: any) => {
            console.error(err);
            this.isGeneratingReport.set(false);
         });
      } else {
        console.error('html2canvas not loaded');
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
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `2025-Memory-Capsule.png`;
    a.click();
  }
}
