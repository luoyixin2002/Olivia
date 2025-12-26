import { bootstrapApplication } from '@angular/platform-browser';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { AppComponent } from './app.component';

bootstrapApplication(AppComponent, {
  providers: [
    provideExperimentalZonelessChangeDetection()
  ]
}).then(() => {
  console.log('Angular App Bootstrapped Successfully');
}).catch(err => {
  console.error('Bootstrap Error:', err);
  // Attempt to show error on UI
  const errorMsg = document.getElementById('load-error-msg');
  const errorText = document.getElementById('error-text');
  const loader = document.querySelector('.loading-spinner');
  
  if (errorMsg && errorText) {
    errorMsg.style.display = 'block';
    if(loader) (loader as HTMLElement).style.display = 'none';
    errorText.textContent = `Bootstrap Failed: ${err.message || err}`;
  }
});