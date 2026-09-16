# Memoire du projet NS Studio

## Contexte

Le projet a demarre comme `latelier`, puis a ete renomme et restructure pour devenir `ns-studio`, publie sur `https://ns.latech.workers.dev`. L'objectif principal est de pouvoir ajouter de nouveaux modules sans toucher ni recompiler inutilement les modules existants, tout en gardant un deploiement simple.

## Decisions prises

- La marque retenue est **NS Studio**.
- Le domaine final reste pour l'instant `https://ns.latech.workers.dev`.
- `kinetiq.dev` a ete abandonne car le domaine existe deja.
- `ns.studio` a ete envisage, puis le choix operationnel est reste sur le sous-domaine Cloudflare actuel.
- Le projet local a ete renomme en `ns-studio`.
- La page profil remplace l'ancien CV, avec une presentation plus professionnelle.

## Architecture actuelle

Le projet est maintenant un monorepo npm workspaces avec une approche micro front-end.

- `apps/web` : shell Angular principale.
- `apps/profile` : micro front-end Angular independant pour le profil.
- `apps/api` : API Cloudflare Worker.
- `modules/profile/contract` : types, donnees et validation du profil.
- `modules/profile/ui` : composants Angular du profil.
- `modules/profile/api` : routes API du module profil.
- `packages/ui` : theme Angular Material, tokens SCSS et styles partages.
- `scripts/compose-remotes.mjs` : copie les remotes dans le build de la shell.

La shell sert `/profile` et embarque le remote profile via `/remotes/profile/`. Le Worker Cloudflare sert a la fois l'API et les assets statiques, ce qui evite la gestion CORS.

## Travail realise

- Conversion du projet vers une architecture micro front-end.
- Ajout d'une shell Angular et d'un remote profile.
- Ajout d'un Worker Cloudflare unique.
- Correction du 404 sur `/profile`.
- Renommage progressif du projet vers NS Studio.
- Passage du profil vers Angular Material et SCSS.
- Refonte visuelle inspiree d'Angular.dev, sans copie directe.
- Ajout d'un background anime avec points ondulants.
- Correction de la visibilite de l'animation de fond.
- Assombrissement du halo en haut a gauche.
- Ajout de `AGENTS.md` comme guide contributeur.

## Commandes utiles

Utiliser la version Node du projet :

```sh
nvm use
```

Commandes principales :

```sh
npm run dev
npm run test
npm run build
npm run format
npm run deploy
```

Pour verifier le deploiement :

```sh
curl -I https://ns.latech.workers.dev/profile
```

## Points sensibles

- Utiliser Node `22.23.2` via `.nvmrc`. Node 24 a deja provoque des erreurs Angular.
- Les commandes Wrangler peuvent afficher un warning macOS 12.6, mais le deploy a fonctionne.
- Le sous-domaine Cloudflare du compte est `latech`; `studio.workers.dev` n'etait pas disponible.
- Les fichiers `.angulardoc.json` et `.vscode/` sont non suivis et n'ont pas ete commits.
- Les assets deployes sont generes dans `apps/web/dist/web/browser`.
- La route `/api/*` doit passer par `run_worker_first` dans `wrangler.jsonc`.

## Commits importants

- `22edb63 Move CV to micro frontend shell`
- `531106c Rename platform to Kinetiq profile`
- `56175df Fix profile remote route`
- `bc0bb81 Publish worker under ns subdomain`
- `e03e551 Rename project to NS Studio and redesign profile`
- `c2c277e Use Angular Material SCSS profile styling`
- `bd2cb62 Refine Angular-inspired profile background`
- `33efafc Remove lower-right profile gradient`
- `f2fc569 Animate profile background`
- `1ef0692 Add wave motion to profile dots`
- `5add5c9 Fix visible profile background animation`

## A faire

- Verifier visuellement l'animation dans un navigateur reel et ajuster sa vitesse/intensite si besoin.
- Decider si `.angulardoc.json` et `.vscode/` doivent etre ignores, commits ou supprimes.
- Eventuellement configurer un domaine personnalise quand le nom definitif est confirme.
- Ajouter un second module exemple pour valider que l'architecture micro front-end est simple a etendre.
- Ajouter des tests UI ou e2e si le profil devient plus interactif.
- Documenter le processus d'ajout d'un nouveau module avec un template ou un script de generation.
