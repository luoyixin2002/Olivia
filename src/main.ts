
import '@angular/compiler'; // JIT Compiler
import { bootstrapApplication } from '@angular/platform-browser';
import { provideZonelessChangeDetection } from '@angular/core';
import { AppComponent } from './app.component';

console.log('Main.ts: Bootstrapping...');

bootstrapApplication(AppComponent, {
  providers: [
    provideZonelessChangeDetection()
  ]
}).then(() => {
  console.log('Bootstrap success');
  const loader = document.getElementById('loading-container');
  if (loader) loader.style.display = 'none';
}).catch(err => {
  console.error('Bootstrap failed', err);
});
