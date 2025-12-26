import { bootstrapApplication } from '@angular/platform-browser';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { AppComponent } from './app.component';

bootstrapApplication(AppComponent, {
  providers: [
    provideExperimentalZonelessChangeDetection()
  ]
}).then(() => {
  console.log('Angular App Bootstrapped Successfully');
}).catch(err => console.error('Bootstrap Error:', err));