import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideBrowserGlobalErrorListeners, type ApplicationConfig } from '@angular/core';

export const profileRemoteConfig: ApplicationConfig = {
  providers: [provideBrowserGlobalErrorListeners(), provideHttpClient(withFetch())],
};
