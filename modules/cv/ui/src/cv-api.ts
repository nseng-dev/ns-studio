import { httpResource } from '@angular/common/http';
import { Injectable } from '@angular/core';

import type { Cv } from '@latelier/cv-contract';

/**
 * L'accès du module CV à son API.
 *
 * `httpResource` porte à lui seul les trois états de la requête — en cours, en erreur, chargée —
 * sous forme de signaux. Il n'y a donc ni RxJS, ni drapeau `chargement` à tenir à jour à la main.
 *
 * L'URL est relative : en développement le proxy du serveur Angular route `/api` vers
 * `localhost:8787`, et en production le Worker sert l'interface et l'API sur la même origine.
 * Aucune URL absolue à configurer, nulle part.
 */
@Injectable({ providedIn: 'root' })
export class CvApi {
  readonly cv = httpResource<Cv>(() => '/api/cv');
}
