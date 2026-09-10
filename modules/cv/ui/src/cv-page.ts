import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { CvApi } from './cv-api';

const MOIS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
] as const;

/**
 * La page du CV.
 *
 * Le composant n'a aucun état propre : il lit la ressource et rend. Tout ce qui pourrait varier
 * — le contenu — vient de l'API, et le reste est du CSS.
 */
@Component({
  selector: 'nara-cv',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cv-page.html',
  styleUrl: './cv-page.css',
})
export class CvPage {
  private readonly api = inject(CvApi);

  /** Exposée telle quelle au gabarit : elle porte `isLoading()`, `error()` et `reload()`. */
  protected readonly ressource = this.api.cv;
  protected readonly cv = computed(() => this.ressource.value());

  /** « 2021-09 » se lit mal en pied de page ; « septembre 2021 » se lit tout seul. */
  protected readonly derniereMiseAJour = computed(() => {
    const brut = this.cv()?.misAJour;
    if (!brut) return null;

    const [annee, mois] = brut.split('-');
    const libelle = MOIS[Number(mois) - 1];
    return libelle ? `${libelle} ${annee}` : brut;
  });
}
