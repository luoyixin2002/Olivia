
import { Component, signal, inject, computed, ElementRef, ViewChild, OnDestroy, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuestionCardComponent, Question } from './components/question-card.component';
import { GeminiService } from './services/gemini.service';
import { JellyCapsuleDirective } from './directives/jelly-capsule.directive';

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
  previewClass: string;
  capsuleTop: string;
  capsuleBottom: string;
  aiContext: string;
  particleType: 'stone' | 'feather'; 
  particleColor: string;
}

interface MemoryParticle {
  id: number;
  type: 'stone' | 'feather';
  left: number;
  bottom: number;
  rotation: number;
  scale: number;
  color: string;
  borderRadius?: string;
  animationDelay: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, QuestionCardComponent, JellyCapsuleDirective],
  styles: [`
    .particle-drop { animation: dropIn 0.6s cubic-bezier(0.25, 1, 0.5, 1) forwards; }
    @keyframes dropIn { from { transform: translateY(-50px) scale(0); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
    .particle-float { animation: float 3s ease-in-out infinite; }
    @keyframes float { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-10px) rotate(5deg); } }
    .animate-spin-slow { animation: spin 8s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .typing-cursor::after { content: '|'; animation: blink 1s step-end infinite; }
    @keyframes blink { 50% { opacity: 0; } }
    .fade-in { animation: fadeIn 0.8s ease-out forwards; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .capsule-bg { position: absolute; border-radius: 50%; filter: blur(60px); opacity: 0.6; }
    .capsule-liquid { width: 100%; height: 100%; background: var(--liquid-color); border-radius: 50%; animation: liquidMorph 10s infinite alternate; }
    @keyframes liquidMorph { 0% { transform: scale(1); } 100% { transform: scale(1.1); } }
    .paper-texture { background-image: url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23noise)' opacity='0.05'/%3E%3C/svg%3E"); }
    .shake-gentle { animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both; }
    @keyframes shake { 10%, 90% { transform: translate3d(-1px, 0, 0); } 20%, 80% { transform: translate3d(2px, 0, 0); } 30%, 50%, 70% { transform: translate3d(-4px, 0, 0); } 40%, 60% { transform: translate3d(4px, 0, 0); } }
    .writing-vertical-rl { writing-mode: vertical-rl; text-orientation: upright; }
    .capsule-open-top { transform: translateY(-40px); }
    .capsule-open-bottom { transform: translateY(40px); }
  `],
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

  <!-- API KEY WARNING BANNER -->
  @if(isDemoMode()) {
    <div class="fixed top-0 left-0 w-full bg-morandi-red/90 text-white text-[10px] md:text-xs py-1 px-4 text-center z-[100] tracking-widest font-sans">
       ⚠️ DEMO MODE: API Key Not Found. (Using Mock Data)
    </div>
  }

  <!-- FLOATING MUSIC PLAYER (Top Right) -->
  <div class="fixed top-6 right-6 z-50 flex flex-col items-end gap-2 fade-in" [class.mt-6]="isDemoMode()">
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
    <header class="absolute top-0 left-0 w-full flex justify-center py-8 pointer-events-none" [class.mt-8]="isDemoMode()">
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
        
        @if(isDemoMode()) {
            <p class="text-xs text-morandi-red mt-4">(Generating Mock Data...)</p>
        }
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
              重写
           </button>

           <button (click)="generateReport()" [disabled]="isGeneratingReport()" class="bg-morandi-dark text-white px-8 py-3 rounded-sm text-xs uppercase tracking-widest hover:bg-morandi-accent transition-colors flex items-center gap-2 shadow-sm">
             @if(isGeneratingReport()) {
                <span class="animate-spin">⟳</span>
             } @else {
                <!-- Updated for WeChat sharing context -->
                <span>保存胶囊卡片</span>
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
            
            <!-- Updated Seal -->
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
                    <p class="md:hidden text-xs text-morandi-dark mt-1 font-serif opacity-80">长按图片保存到相册分享朋友圈</p>
                 </div>
                 
                 <div class="flex gap-4">
                    <!-- Only keep Save/Download button here, Close is now global -->
                   <button (click)="downloadReport()" class="hidden md:flex bg-morandi-dark text-white hover:bg-morandi-accent px-6 py-2 rounded-sm text-xs uppercase tracking-widest transition-colors shadow-sm items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M12 12.75l-3 3m0 0 3 3m-3-3h7.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                      </svg>
                      保存图片
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

  // View Children
  @ViewChild('bgmInput') bgmInput!: ElementRef<HTMLInputElement>;
  @ViewChild('reportNode') reportNode!: ElementRef<HTMLDivElement>;

  // Signals
  viewState = signal<'intro' | 'color-selection' | 'unlocking' | 'questions' | 'loading' | 'results'>('intro');
  isDemoMode = this.geminiService.isDemoModeSignal;
  
  // Color Selection
  colorOptions: YearColor[] = [
    { 
      id: 'warm', name: '赤陶', desc: 'Warm Terracotta', 
      previewClass: 'bg-[#E27D60]', 
      capsuleTop: '#E27D60', capsuleBottom: '#C35B40',
      aiContext: 'Warm, passionate, energetic, earthy',
      particleType: 'stone', particleColor: '#E27D60'
    },
    { 
      id: 'nature', name: '苔绿', desc: 'Moss Green', 
      previewClass: 'bg-[#85A286]', 
      capsuleTop: '#85A286', capsuleBottom: '#6B856C',
      aiContext: 'Natural, growth, healing, calm',
      particleType: 'feather', particleColor: '#85A286'
    },
    { 
      id: 'calm', name: '雾蓝', desc: 'Foggy Blue', 
      previewClass: 'bg-[#89ABE3]', 
      capsuleTop: '#89ABE3', capsuleBottom: '#6A8CC3',
      aiContext: 'Calm, rational, melancholic, deep',
      particleType: 'feather', particleColor: '#89ABE3'
    },
    { 
      id: 'minimal', name: '月灰', desc: 'Moon Grey', 
      previewClass: 'bg-[#D3D3D3]', 
      capsuleTop: '#D3D3D3', capsuleBottom: '#B0B0B0',
      aiContext: 'Minimalist, objective, balanced, silent',
      particleType: 'stone', particleColor: '#A9A9A9'
    },
    { 
      id: 'vintage', name: '琥珀', desc: 'Amber', 
      previewClass: 'bg-[#E6C229]', 
      capsuleTop: '#E6C229', capsuleBottom: '#CBA618',
      aiContext: 'Vintage, nostalgic, warm memory, precious',
      particleType: 'feather', particleColor: '#E6C229'
    }
  ];
  selectedColor = signal<YearColor | null>(null);

  // Unlocking
  unlockProgress = signal(0);
  isUnlocking = signal(false);
  private unlockInterval: any;

  // Questions
  questions: Question[] = [
    { id: '1', category: 'Recall', textZh: '2025年，哪一个瞬间让你觉得“活着真好”？', textEn: 'A moment you felt truly alive.', placeholder: '那是初夏的...' },
    { id: '2', category: 'Connection', textZh: '这一年，谁是你最意想不到的相遇？', textEn: 'The most unexpected encounter.', placeholder: '在书店...' },
    { id: '3', category: 'Letting Go', textZh: '你终于放下了什么？', textEn: 'What did you finally let go of?', placeholder: '对他/她的执念...' },
    { id: '4', category: 'Achievement', textZh: '哪怕微不足道，哪件事是你坚持最久的？', textEn: 'Something you persisted in.', placeholder: '每天早起...' },
    { id: '5', category: 'Self', textZh: '用一个词形容你的2025年。', textEn: 'One word for your 2025.', placeholder: '重建...' }
  ];
  currentStep = signal(0);
  currentQuestion = computed(() => this.questions[this.currentStep()]);
  progress = computed(() => ((this.currentStep() + 1) / this.questions.length) * 100);
  
  answers = signal<Record<string, string>>({});
  
  // Inspiration
  currentInspiration = signal<string | null>(null);
  isGettingInspiration = signal(false);

  // Particles
  memoryParticles = signal<MemoryParticle[]>([]);

  // Checkpoint
  showCheckpoint = signal(false);
  checkpointMessage = signal('');

  // Analysis
  analysisResult = signal<AnalysisResult | null>(null);
  letterParagraphs = computed(() => {
    const body = this.analysisResult()?.letterBody;
    return body ? body.split('\n').filter(p => p.trim().length > 0) : [];
  });

  // Chat
  chatHistory = signal<{role: string, parts: string}[]>([]);
  chatInput = signal('');

  // Report
  generatedReportUrl = signal<string | null>(null);
  isGeneratingReport = signal(false);

  // Audio
  private audio = new Audio();
  isAudioPlaying = signal(false);
  hasAudioSource = signal(false);

  constructor() {
    this.audio.loop = true;
  }

  ngOnInit() {
    // Initial check
  }

  ngOnDestroy() {
    this.audio.pause();
    if (this.unlockInterval) clearInterval(this.unlockInterval);
  }

  // Audio Methods
  onBgmFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      this.audio.src = url;
      this.hasAudioSource.set(true);
      this.audio.play().then(() => this.isAudioPlaying.set(true)).catch(() => {});
    }
  }

  toggleAudio() {
    if (!this.hasAudioSource()) return;
    if (this.audio.paused) {
      this.audio.play();
      this.isAudioPlaying.set(true);
    } else {
      this.audio.pause();
      this.isAudioPlaying.set(false);
    }
  }

  // Navigation
  startJourney() {
    this.viewState.set('color-selection');
  }

  confirmColor(color: YearColor) {
    this.selectedColor.set(color);
    this.viewState.set('unlocking');
  }

  // Unlocking Logic
  startUnlock() {
    this.isUnlocking.set(true);
    this.unlockInterval = setInterval(() => {
      this.unlockProgress.update(v => {
        if (v >= 100) {
          clearInterval(this.unlockInterval);
          this.viewState.set('questions');
          return 100;
        }
        return v + 2; // Speed
      });
    }, 30);
  }

  endUnlock() {
    this.isUnlocking.set(false);
    if (this.unlockProgress() < 100) {
      clearInterval(this.unlockInterval);
      // Decay
      const decay = setInterval(() => {
        this.unlockProgress.update(v => {
          if (v <= 0) {
            clearInterval(decay);
            return 0;
          }
          return v - 5;
        });
      }, 10);
    }
  }

  // Questions Logic
  getAnswerFor(id: string) {
    return this.answers()[id] || '';
  }

  handleBack() {
    if (this.currentStep() > 0) {
      this.currentStep.update(v => v - 1);
      this.currentInspiration.set(null);
    }
  }

  handleAnswer(answer: string) {
    const q = this.currentQuestion();
    this.answers.update(curr => ({ ...curr, [q.id]: answer }));
    
    // Add particle
    this.addParticle();

    // Checkpoint feedback
    if (this.currentStep() === 2) {
      this.showCheckpointToast('Memory Fragment Saved');
    }

    if (this.currentStep() < this.questions.length - 1) {
      this.currentStep.update(v => v + 1);
      this.currentInspiration.set(null);
    } else {
      this.submitAll();
    }
  }

  addParticle() {
    const color = this.selectedColor();
    if (!color) return;
    
    const p: MemoryParticle = {
      id: Date.now(),
      type: color.particleType,
      left: Math.random() * 80 + 10, // 10-90%
      bottom: -20,
      rotation: Math.random() * 360,
      scale: 0.5 + Math.random() * 0.5,
      color: color.particleColor,
      borderRadius: color.particleType === 'stone' ? `${30 + Math.random() * 40}%` : undefined,
      animationDelay: '0s'
    };
    
    this.memoryParticles.update(curr => [...curr, p]);
  }

  showCheckpointToast(msg: string) {
    this.checkpointMessage.set(msg);
    this.showCheckpoint.set(true);
    setTimeout(() => this.showCheckpoint.set(false), 2000);
  }

  async getInspiration() {
    if (this.isGettingInspiration()) return;
    this.isGettingInspiration.set(true);
    try {
      const q = this.currentQuestion();
      const text = await this.geminiService.generateInspiration(q.textZh);
      this.currentInspiration.set(text);
    } catch (e) {
      console.error(e);
    } finally {
      this.isGettingInspiration.set(false);
    }
  }

  async submitAll() {
    this.viewState.set('loading');
    try {
      const result = await this.geminiService.generateYearReview(this.answers(), this.selectedColor()?.aiContext || 'Warm');
      // If it returns { text: jsonString }, parse it
      let parsed = result;
      if (result && result.text && typeof result.text === 'string') {
          // It might be markdown code block
          let clean = result.text.replace(/```json/g, '').replace(/```/g, '').trim();
          try {
            parsed = JSON.parse(clean);
          } catch(e) {
             console.error('JSON parse failed', e);
             // Fallback
             parsed = {
               keywords: [],
               portrait: { mentalCore: '', actionPattern: '', emotionalTone: '' },
               letterTitle: 'Error Parsing',
               letterBody: result.text
             };
          }
      }
      this.analysisResult.set(parsed);
      
      // Init chat
      this.chatHistory.set([{ role: 'model', parts: '我是你的2025年记忆。你想问我什么？' }]);
      
      this.viewState.set('results');
    } catch (e) {
      console.error(e);
      // Go back or show error
      this.viewState.set('questions');
    }
  }

  resetJourney() {
    this.answers.set({});
    this.currentStep.set(0);
    this.viewState.set('intro');
    this.memoryParticles.set([]);
  }

  // Chat
  async sendChatMessage() {
    const msg = this.chatInput().trim();
    if (!msg) return;

    this.chatHistory.update(h => [...h, { role: 'user', parts: msg }]);
    this.chatInput.set('');

    try {
      const response = await this.geminiService.chatWithYear(this.chatHistory(), msg);
      this.chatHistory.update(h => [...h, { role: 'model', parts: response }]);
    } catch (e) {
       this.chatHistory.update(h => [...h, { role: 'model', parts: '... (Connection Error)' }]);
    }
  }

  // Report
  async generateReport() {
    this.isGeneratingReport.set(true);
    // wait for render
    setTimeout(async () => {
       if (typeof html2canvas !== 'undefined' && this.reportNode) {
          try {
            const canvas = await html2canvas(this.reportNode.nativeElement, {
              scale: 2,
              useCORS: true,
              backgroundColor: '#F9F7F2'
            });
            this.generatedReportUrl.set(canvas.toDataURL('image/png'));
          } catch (e) {
            console.error(e);
          }
       }
       this.isGeneratingReport.set(false);
    }, 100);
  }

  closeReportModal() {
    this.generatedReportUrl.set(null);
  }

  downloadReport() {
    const url = this.generatedReportUrl();
    if (url) {
      const link = document.createElement('a');
      link.href = url;
      link.download = '2025-Memory-Capsule.png';
      link.click();
    }
  }
}
