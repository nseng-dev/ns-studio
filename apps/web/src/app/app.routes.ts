import type { Routes } from '@angular/router';

/**
 * Le plan de la shell.
 *
 * Les modules front sont des applications compilées à part, puis déposées sous `/remotes/*`.
 * La shell ne compile donc pas le code du profil : elle ne connaît que son URL publique.
 */
export const routes: Routes = [
  {
    path: 'profile',
    title: 'Nathan SENG — Développeur Web',
    loadComponent: () => import('./remote-frame/remote-frame').then((m) => m.RemoteFrame),
    data: {
      title: 'Profil - Nathan SENG',
      src: '/remotes/profile/',
    },
  },

  { path: '', pathMatch: 'full', redirectTo: 'profile' },
  { path: 'profile', redirectTo: 'profile' },
  { path: '**', redirectTo: 'profile' },
];
