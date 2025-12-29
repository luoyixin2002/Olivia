
import 'zone.js';
import '@angular/compiler';
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app.component';

console.log('App starting...');

bootstrapApplication(AppComponent, {
  providers: []
}).then(() => {
  console.log('Angular App Bootstrapped');
  const loader = document.getElementById('loading-container');
  if (loader) loader.style.display = 'none';
}).catch(err => {
  console.error('Bootstrap failed', err);
});
