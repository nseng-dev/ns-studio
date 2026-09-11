import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideBrowserGlobalErrorListeners, type ApplicationConfig } from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';

import { routes } from './app.routes';

/**
 * Configuration de l'application.
 *
 * Aucun `provideZoneChangeDetection` : depuis Angular 21 le mode « zoneless » est le défaut du
 * framework, et toute la réactivité de la plateforme passe par des signaux.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withFetch()),
    provideRouter(
      routes,
      withComponentInputBinding(),
      // Changer de module doit ramener en haut de page, comme le ferait un vrai changement de page.
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
    ),
  ],
};
