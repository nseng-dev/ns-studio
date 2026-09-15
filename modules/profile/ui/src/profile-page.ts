import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';

import { ProfileApi } from './profile-api';

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
 * La page du profil.
 *
 * Le composant n'a aucun état propre : il lit la ressource et rend. Tout ce qui pourrait varier
 * — le contenu — vient de l'API, et le reste est du CSS.
 */
@Component({
  selector: 'ns-profile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatChipsModule],
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.scss',
})
export class ProfilePage {
  private readonly api = inject(ProfileApi);

  /** Exposée telle quelle au gabarit : elle porte `isLoading()`, `error()` et `reload()`. */
  protected readonly ressource = this.api.profile;
  protected readonly profile = computed(() => this.ressource.value());

  /** « 2021-09 » se lit mal en pied de page ; « septembre 2021 » se lit tout seul. */
  protected readonly derniereMiseAJour = computed(() => {
    const brut = this.profile()?.misAJour;
    if (!brut) return null;

    const [annee, mois] = brut.split('-');
    const libelle = MOIS[Number(mois) - 1];
    return libelle ? `${libelle} ${annee}` : brut;
  });
}
