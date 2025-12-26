import { Directive, ElementRef, Input, NgZone, OnDestroy, OnInit } from '@angular/core';

@Directive({
  selector: '[appJellyCapsule]',
  standalone: true,
  host: {
    '(mousedown)': 'onStart($event)',
    '(touchstart)': 'onStart($event)',
    '(document:mousemove)': 'onMove($event)',
    '(document:touchmove)': 'onMove($event)',
    '(document:mouseup)': 'onEnd()',
    '(document:touchend)': 'onEnd()'
  }
})
export class JellyCapsuleDirective implements OnInit, OnDestroy {
  @Input() stiffness = 0.05; // Spring tension
  @Input() damping = 0.85;   // Friction
  @Input() mass = 1;

  private isDragging = false;
  private startX = 0;
  private startY = 0;
  
  // Physics State
  private currentX = 0;
  private currentY = 0;
  private targetX = 0;
  private targetY = 0;
  private velocityX = 0;
  private velocityY = 0;
  
  // Scale/Squeeze State
  private scaleX = 1;
  private scaleY = 1;
  private velocityScaleX = 0;
  private velocityScaleY = 0;

  // Idle Float Animation State
  private time = Math.random() * 100;
  private floatSpeed = 0.01 + Math.random() * 0.01;
  private floatRange = 20;

  private rafId: any;

  constructor(private el: ElementRef, private ngZone: NgZone) {}

  ngOnInit() {
    // Run physics loop outside Angular zone to prevent change detection overhead
    this.ngZone.runOutsideAngular(() => {
      this.loop();
    });
    
    // Set initial cursor style
    this.el.nativeElement.style.cursor = 'grab';
    this.el.nativeElement.style.touchAction = 'none'; // Prevent scroll on mobile
  }

  ngOnDestroy() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
  }

  onStart(event: MouseEvent | TouchEvent) {
    this.isDragging = true;
    this.el.nativeElement.style.cursor = 'grabbing';
    this.el.nativeElement.style.transition = 'none'; // Disable CSS transitions for physics
    
    // Add a satisfying "press" squeeze immediately
    this.velocityScaleX += 0.1;
    this.velocityScaleY -= 0.1;

    const clientX = event instanceof MouseEvent ? event.clientX : event.touches[0].clientX;
    const clientY = event instanceof MouseEvent ? event.clientY : event.touches[0].clientY;

    // Calculate offset from the element's center to avoid jumping
    // We treat the current visual position as the anchor
    this.startX = clientX - this.currentX;
    this.startY = clientY - this.currentY;
  }

  onMove(event: MouseEvent | TouchEvent) {
    if (!this.isDragging) return;

    const clientX = event instanceof MouseEvent ? event.clientX : event.touches[0].clientX;
    const clientY = event instanceof MouseEvent ? event.clientY : event.touches[0].clientY;

    this.targetX = clientX - this.startX;
    this.targetY = clientY - this.startY;
  }

  onEnd() {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.el.nativeElement.style.cursor = 'grab';
    
    // On release, target returns to 0 (origin), physics will handle the spring back
    this.targetX = 0;
    this.targetY = 0;
    
    // Release "Pop"
    this.velocityScaleX -= 0.1;
    this.velocityScaleY += 0.1;
  }

  private loop() {
    // 1. Idle Floating (Only applies to target when not dragging)
    if (!this.isDragging) {
        this.time += this.floatSpeed;
        this.targetX = Math.sin(this.time) * this.floatRange;
        this.targetY = Math.cos(this.time * 0.8) * this.floatRange;
    }

    // 2. Physics: Spring Force for Position
    const forceX = (this.targetX - this.currentX) * this.stiffness;
    const forceY = (this.targetY - this.currentY) * this.stiffness;

    this.velocityX += forceX / this.mass;
    this.velocityY += forceY / this.mass;

    this.velocityX *= this.damping;
    this.velocityY *= this.damping;

    this.currentX += this.velocityX;
    this.currentY += this.velocityY;

    // 3. Physics: Squeeze/Stretch based on Velocity
    // The faster it moves, the more it stretches in movement direction
    // Logic: Conservation of volume (scaleX * scaleY ≈ 1)
    
    // Calculate speed magnitude
    const speed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
    const maxStretch = 0.3; // Max deformation
    const stretchFactor = 0.02;

    // Target scale based on movement
    // Note: A real jelly skews, but simple scaling looks good enough for UI bubbles
    let targetScaleX = 1 + Math.min(Math.abs(this.velocityX) * stretchFactor, maxStretch) - Math.min(Math.abs(this.velocityY) * stretchFactor, maxStretch);
    let targetScaleY = 1 + Math.min(Math.abs(this.velocityY) * stretchFactor, maxStretch) - Math.min(Math.abs(this.velocityX) * stretchFactor, maxStretch);
    
    // Apply Spring to Scale as well (wobbly effect)
    const scaleForceX = (targetScaleX - this.scaleX) * 0.1;
    const scaleForceY = (targetScaleY - this.scaleY) * 0.1;

    this.velocityScaleX += scaleForceX;
    this.velocityScaleY += scaleForceY;

    this.velocityScaleX *= 0.8; // Heavy damping for wobble
    this.velocityScaleY *= 0.8;

    this.scaleX += this.velocityScaleX;
    this.scaleY += this.velocityScaleY;

    // 4. Apply Transform
    // Rotate slightly based on X velocity to simulate "leaning"
    const rotate = this.velocityX * 2; 

    const transform = `
      translate3d(${this.currentX}px, ${this.currentY}px, 0) 
      rotate(${rotate}deg) 
      scale(${this.scaleX}, ${this.scaleY})
    `;

    this.el.nativeElement.style.transform = transform;

    this.rafId = requestAnimationFrame(() => this.loop());
  }
}