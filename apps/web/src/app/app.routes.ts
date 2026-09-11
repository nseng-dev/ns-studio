import type { Routes } from '@angular/router';

/**
 * Le plan de la plateforme.
 *
 * **Ajouter un module, c'est ajouter une entrée ici** — le pendant, côté interface, du
 * `app.route()` du Worker. Chaque module est chargé paresseusement : ouvrir le CV ne télécharge
 * pas le code des modules que le visiteur ne consultera jamais.
 */
export const routes: Routes = [
  {
    path: 'cv',
    title: 'Nathan SENG — Développeur Web',
    loadComponent: () => import('@latelier/cv-ui').then((m) => m.CvPage),
  },

  // Le CV est aujourd'hui le seul module : la racine y mène directement, pour que l'adresse la
  // plus courte soit celle que l'on partage.
  { path: '', pathMatch: 'full', redirectTo: 'cv' },
  { path: '**', redirectTo: 'cv' },
];
