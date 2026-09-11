import type { Routes } from '@angular/router';

/**
 * Le plan de la shell.
 *
 * Les modules front sont des applications compilées à part, puis déposées sous `/remotes/*`.
 * La shell ne compile donc pas le code du CV : elle ne connaît que son URL publique.
 */
export const routes: Routes = [
  {
    path: 'cv',
    title: 'Nathan SENG — Développeur Web',
    loadComponent: () => import('./remote-frame/remote-frame').then((m) => m.RemoteFrame),
    data: {
      title: 'CV - Nathan SENG',
      src: '/remotes/cv/',
    },
  },

  { path: '', pathMatch: 'full', redirectTo: 'cv' },
  { path: '**', redirectTo: 'cv' },
];
