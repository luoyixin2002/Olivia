
import 'zone.js'; // Standard Angular Change Detection
import '@angular/compiler';
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app.component';

console.log('Main.ts: Starting bootstrap sequence...');

// Bootstrapping without experimental providers to ensure stability
bootstrapApplication(AppComponent, {
  providers: []
}).then(() => {
  console.log('Main.ts: Bootstrap success');
  const loader = document.getElementById('loading-container');
  if (loader) loader.style.display = 'none';
}).catch(err => {
  console.error('Main.ts: Bootstrap failed', err);
  throw err;
});
