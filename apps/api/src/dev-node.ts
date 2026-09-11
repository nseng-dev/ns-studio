/**
 * Le serveur de développement local, sous Node.
 *
 * **Pourquoi il existe.** En production, l'API tourne dans le runtime Cloudflare (workerd), et
 * `wrangler dev` le reproduit fidèlement en local. Mais workerd exige macOS 13.5 ou plus : sur
 * une machine plus ancienne, il refuse de démarrer. Ce fichier contourne le runtime, pas
 * l'application.
 *
 * **Ce qu'il ne change pas.** Il importe le même objet `app` que le Worker : mêmes routes, même
 * code, mêmes réponses. Il n'y a pas deux implémentations à tenir synchronisées — c'est
 * précisément ce qui rend le procédé sûr.
 *
 * **Ce qu'il ne couvre pas.** Le service des fichiers statiques et l'aiguillage
 * `run_worker_first` viennent de `wrangler.jsonc`, pas de ce code : ici, c'est le serveur de
 * développement Angular qui sert l'interface et proxifie `/api`. Pour éprouver la configuration
 * elle-même, il faut `npx wrangler dev --remote` (qui exécute sur l'infrastructure Cloudflare et
 * n'a donc pas besoin de workerd en local), ou tout simplement un déploiement.
 *
 * Ce fichier n'est jamais déployé : `wrangler.jsonc` pointe sur `index.ts`.
 */

import { serve } from '@hono/node-server';

import app from './index.js';

const port = Number(process.env['PORT'] ?? 8787);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[latelier] API de développement prête sur http://localhost:${info.port}`);
  console.log(`[latelier] essayez http://localhost:${info.port}/api/cv`);
});
