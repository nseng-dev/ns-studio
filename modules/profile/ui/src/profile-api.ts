import { httpResource } from '@angular/common/http';
import { Injectable } from '@angular/core';

import type { Profile } from '@ns-studio/profile-contract';

/**
 * L'accès du module profil à son API.
 *
 * `httpResource` porte à lui seul les trois états de la requête — en cours, en erreur, chargée —
 * sous forme de signaux. Il n'y a donc ni RxJS, ni drapeau `chargement` à tenir à jour à la main.
 *
 * L'URL est relative : en développement le proxy du serveur Angular route `/api` vers
 * `localhost:8787`, et en production le Worker sert l'interface et l'API sur la même origine.
 * Aucune URL absolue à configurer, nulle part.
 */
@Injectable({ providedIn: 'root' })
export class ProfileApi {
  readonly profile = httpResource<Profile>(() => '/api/profile');
}
