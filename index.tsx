import '@angular/compiler';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { AppComponent } from './src/app.component';

bootstrapApplication(AppComponent, {
  providers: [
    provideExperimentalZonelessChangeDetection()
  ]
}).then(() => {
  console.log('Angular App Bootstrapped Successfully (index.tsx)');
}).catch(err => console.error(err));

// AI Studio always uses an `index.tsx` file for all project types.