import '@angular/compiler'; // Required for JIT in Vite
import { bootstrapApplication } from '@angular/platform-browser';
import { provideZonelessChangeDetection } from '@angular/core';
import { AppComponent } from './app.component';

console.log('App: Bootstrapping...');

bootstrapApplication(AppComponent, {
  providers: [
    provideZonelessChangeDetection()
  ]
}).then(() => {
  console.log('App: Bootstrap Successful');
  // Remove loader
  const loader = document.getElementById('loading-container');
  if (loader) loader.style.display = 'none';
}).catch(err => {
  console.error('App: Bootstrap Failed', err);
});