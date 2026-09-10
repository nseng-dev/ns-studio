/**
 * Les routes HTTP du module CV.
 *
 * Elles ne connaissent pas la provenance du contenu : `lireCv()` le leur donne. Le jour où le
 * CV viendra d'une base D1, ce fichier ne bougera pas — c'est tout l'intérêt d'avoir isolé la
 * lecture dans le contrat.
 */

import { lireCv, type ErreurApi } from '@nara/cv-contract';
import { Hono } from 'hono';

export const routesCv = new Hono();

/**
 * `GET /api/cv` — le CV complet.
 *
 * Un CV invalide est une erreur de serveur, pas de requête : le visiteur n'y est pour rien,
 * d'où le 500. Le détail des règles violées est renvoyé parce que le contenu est public de
 * toute façon, et que sans lui le diagnostic imposerait de rouvrir les journaux.
 */
routesCv.get('/', (c) => {
  const resultat = lireCv();

  if (!resultat.ok) {
    const corps: ErreurApi = {
      code: 'CV_INVALIDE',
      message: 'Le contenu du CV ne respecte pas son contrat : la page ne peut pas être rendue.',
      erreurs: resultat.erreurs,
    };
    return c.json(corps, 500);
  }

  // Le contenu ne change qu'au déploiement. Cinq minutes évitent de réveiller le Worker à
  // chaque rechargement, sans rendre une correction invisible trop longtemps.
  c.header('Cache-Control', 'public, max-age=300');
  return c.json(resultat.cv);
});
