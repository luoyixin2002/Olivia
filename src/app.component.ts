import { Component, signal, inject, computed, ElementRef, ViewChild, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
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

      <!-- MEMORY PARTICLE PILE (Mountain of Memories) -->
      <!-- Z-index 0 to ensure it is BEHIND the card -->
      <!-- Positioned in bottom right corner -->
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
          <!-- Apply paper-texture class here -->
          <div class="md:col-span-7 paper-texture bg-[#F9F7F2] p-10 md:p-16 shadow-sm border-t-4 border-morandi-dark/80 relative overflow-hidden">
             
             <!-- CAPSULE WATERMARK (User's chosen color) -->
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
            
            <!-- Updated Seal: No Birds, Large Floral Number -->
             <div class="flex justify-end mt-16 opacity-90 relative z-10">
                <div class="w-40 h-40 flex items-center justify-center relative rotate-[-6deg] opacity-80 mix-blend-multiply text-morandi-red">
                   <!-- Texture/Roughness -->
                   <div class="absolute inset-0 rounded-full border-[3px] border-morandi-red/40 border-dashed opacity-50"></div>
                   
                   <svg viewBox="0 0 200 200" class="w-full h-full p-2" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
                      
                      <!-- Stars Group (Sparkle Shape - Concave Curves) -->
                      <path d="M100 20 C 102 40 110 45 120 48 C 110 51 102 56 100 76 C 98 56 90 51 80 48 C 90 45 98 40 100 20 Z" />
                      <path d="M100 130 C 103 150 115 155 130 158 C 115 161 103 166 100 186 C 97 166 85 161 70 158 C 85 155 97 150 100 130 Z" />
                      <path d="M50 60 C 51 65 55 67 60 68 C 55 69 51 71 50 76 C 49 71 45 69 40 68 C 45 67 49 65 50 60 Z" />
                      <path d="M150 50 C 151 55 155 57 160 58 C 155 59 151 61 150 66 C 149 61 145 59 140 58 C 145 57 149 55 150 50 Z" />

                      <!-- Removed Swallows -->

                      <!-- Decor Dots -->
                      <circle cx="80" cy="80" r="1.5" fill="currentColor" stroke="none" />
                      <circle cx="120" cy="70" r="1.5" fill="currentColor" stroke="none" />
                      <circle cx="160" cy="140" r="1" fill="currentColor" stroke="none" />
                      <circle cx="40" cy="150" r="1" fill="currentColor" stroke="none" />

                      <!-- Large Floral 2025 -->
                      <text x="100" y="115" text-anchor="middle" font-family="'Great Vibes', cursive" font-weight="normal" font-size="55" fill="currentColor" stroke="none">2025</text>
                      
                      <!-- Text Memory -->
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
              <!-- UPDATED: slice(1) to show the initial Greeting from the model -->
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

    <!-- HIDDEN REPORT NODE FOR GENERATION (Off-screen but rendered) -->
    <!-- Updated with paper-texture and new seal -->
    <div class="absolute left-[-9999px] top-0 w-[600px] paper-texture bg-[#F9F7F2] p-16 text-morandi-dark font-serif" #reportNode>
       
       <!-- CAPSULE WATERMARK (User's chosen color) -->
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

         <!-- Footer Seal (Updated European Retro Style for Report) -->
         <div class="flex justify-between items-end mt-16 pt-8 border-t border-morandi-dark/10 relative z-10">
            <div class="text-[10px] text-morandi-text/40 tracking-[0.3em] uppercase">
               2025 Memory Capsule<br>AI Generated Report
            </div>
            
            <!-- European Seal (REPLICATED NEW DESIGN) -->
            <div class="w-40 h-40 flex items-center justify-center relative rotate-[-6deg] opacity-80 mix-blend-multiply text-morandi-red">
               <!-- Texture/Roughness -->
               <div class="absolute inset-0 rounded-full border-[3px] border-morandi-red/40 border-dashed opacity-50"></div>

               <svg viewBox="0 0 200 200" class="w-full h-full p-2" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
                  <!-- Stars Group (Sparkle Shape - Concave Curves) -->
                  <path d="M100 20 C 102 40 110 45 120 48 C 110 51 102 56 100 76 C 98 56 90 51 80 48 C 90 45 98 40 100 20 Z" />
                  <path d="M100 130 C 103 150 115 155 130 158 C 115 161 103 166 100 186 C 97 166 85 161 70 158 C 85 155 97 150 100 130 Z" />
                  <path d="M50 60 C 51 65 55 67 60 68 C 55 69 51 71 50 76 C 49 71 45 69 40 68 C 45 67 49 65 50 60 Z" />
                  <path d="M150 50 C 151 55 155 57 160 58 C 155 59 151 61 150 66 C 149 61 145 59 140 58 C 145 57 149 55 150 50 Z" />

                  <!-- Decor Dots -->
                  <circle cx="80" cy="80" r="1.5" fill="currentColor" stroke="none" />
                  <circle cx="120" cy="70" r="1.5" fill="currentColor" stroke="none" />
                  <circle cx="160" cy="140" r="1" fill="currentColor" stroke="none" />
                  <circle cx="40" cy="150" r="1" fill="currentColor" stroke="none" />

                  <!-- Large Floral 2025 -->
                  <text x="100" y="115" text-anchor="middle" font-family="'Great Vibes', cursive" font-weight="normal" font-size="55" fill="currentColor" stroke="none">2025</text>
                  
                  <!-- Text Memory -->
                  <text x="100" y="145" text-anchor="middle" font-family="'Ma Shan Zheng', cursive" font-size="16" fill="currentColor" stroke="none" letter-spacing="2">Memory</text>
               </svg>
            </div>
         </div>
       }
    </div>

    <!-- REPORT MODAL (FIXED CLOSE BUTTON) -->
    @if(generatedReportUrl()) {
      <div class="fixed inset-0 z-[100] bg-morandi-bg/95 backdrop-blur-md overflow-y-auto fade-in cursor-pointer" (click)="closeReportModal()">
         
         <!-- FIXED CLOSE BUTTON (Top Right) - Always visible -->
         <button (click)="closeReportModal()" class="fixed top-6 right-6 z-[110] bg-white text-morandi-dark hover:bg-morandi-red hover:text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all border border-morandi-sand group">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5 group-hover:rotate-90 transition-transform">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
         </button>

         <!-- Wrapper for centering/layout -->
         <div class="flex min-h-full items-center justify-center p-4 md:p-8">
            
            <!-- Card -->
            <div class="bg-white p-2 rounded-sm w-full max-w-xl shadow-2xl relative border border-morandi-sand my-8 cursor-default" (click)="$event.stopPropagation()">
               
               <!-- Image -->
               <img [src]="generatedReportUrl()" class="w-full h-auto rounded-sm block select-none" style="-webkit-touch-callout: default;">
               
               <!-- Actions Row (Keep for context) -->
               <div class="mt-4 px-2 pb-2 flex flex-col md:flex-row justify-between items-center gap-4">
                 <div class="text-center md:text-left">
                    <p class="text-[10px] uppercase tracking-widest text-morandi-text/60">
                       <span class="md:hidden">Long Press Image to Save</span>
                       <span class="hidden md:inline">2025 Memory</span>
                    </p>
                    <p class="md:hidden text-xs text-morandi-dark mt-1 font-serif opacity-80">长按图片保存到相册</p>
                 </div>
                 
                 <div class="flex gap-4">
                    <!-- Only keep Save/Download button here, Close is now global -->
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