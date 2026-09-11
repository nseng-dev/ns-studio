import { bootstrapApplication } from '@angular/platform-browser';

import { CvRemoteApp } from './app/cv-remote-app';
import { cvRemoteConfig } from './app/cv-remote.config';

bootstrapApplication(CvRemoteApp, cvRemoteConfig).catch((erreur: unknown) => console.error(erreur));
