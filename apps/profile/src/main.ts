import { bootstrapApplication } from '@angular/platform-browser';

import { ProfileRemoteApp } from './app/profile-remote-app';
import { profileRemoteConfig } from './app/profile-remote.config';

bootstrapApplication(ProfileRemoteApp, profileRemoteConfig).catch((erreur: unknown) =>
  console.error(erreur),
);
