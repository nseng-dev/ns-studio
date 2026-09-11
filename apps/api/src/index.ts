/**
 * Le Worker Cloudflare de la plateforme.
 *
 * Il ne contient aucune logique métier : il monte les routes de chaque module, et c'est tout.
 * **Ajouter un module, c'est ajouter une ligne ici.**
 *
 * Les fichiers de l'interface Angular ne passent pas par ce code : `wrangler.jsonc` les sert
 * directement depuis le stockage d'assets, et `run_worker_first` réserve `/api/*` au Worker.
 * Un seul déploiement, une seule origine — donc aucun CORS à configurer.
 */

import { routesCv } from '@latelier/cv-api';
import { Hono } from 'hono';

const app = new Hono();

app.route('/api/cv', routesCv);

/**
 * Filet pour les routes d'API inconnues.
 *
 * Sans lui, une faute de frappe sur `/api/…` renverrait la coquille Angular en HTML, et le
 * client échouerait à l'analyser avec un message incompréhensible.
 */
app.notFound((c) =>
  c.json({ code: 'ROUTE_INCONNUE', message: `Aucune route ${c.req.path}.` }, 404),
);

export default app;
