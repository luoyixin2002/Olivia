import 'zone.js'; // Critical for browser compatibility in this setup
import '@angular/compiler'; // Critical for JIT compilation
import { bootstrapApplication } from '@angular/platform-browser';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { AppComponent } from './app.component';

console.log('Main.ts: Starting bootstrap sequence...');

bootstrapApplication(AppComponent, {
  providers: [
    provideExperimentalZonelessChangeDetection()
  ]
}).then(() => {
  console.log('Main.ts: Bootstrap success');
  // Remove loading screen if Angular succeeds
  const loader = document.getElementById('loading-container');
  if (loader) loader.style.display = 'none';
}).catch(err => {
  console.error('Main.ts: Bootstrap failed', err);
  throw err;
});