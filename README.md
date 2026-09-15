# ns-studio

Plateforme NS Studio. **Un seul Worker Cloudflare, une shell Angular, des micro front-ends indépendants.**
Le premier module est le profil.

**En ligne : <https://ns.latech.workers.dev>**

```
                        Navigateur du visiteur
                                  │
   ┌──────────────────────────────▼───────────────────────────────────┐
   │            UN SEUL Cloudflare Worker — un seul déploiement       │
   │                                                                  │
   │   run_worker_first: ["/api/*"]      ◄── l'aiguillage, 1 ligne    │
   │                                                                  │
   │   /api/profile  ──►  Hono  ──►  @ns-studio/profile-contract  ──►  profile.fr.json   │
   │                                                                  │
   │   /*       ──►  Static Assets  ──►  shell + /remotes/profile/       │
   │                 not_found_handling: "single-page-application"    │
   └──────────────────────────────────────────────────────────────────┘
```

Front **et** API partent ensemble : une seule origine, donc **aucun CORS à configurer**.

---

## 1. La structure

Un **module** est une tranche verticale : son contrat, son interface et ses routes vivent dans le
même dossier, et bougent ensemble.

```
ns-studio/
├── .nvmrc                       22.23.2
├── wrangler.jsonc               assets + run_worker_first
├── .github/workflows/ci.yml     build → tests → déploiement
│
├── packages/
│   └── ui/        @ns-studio/ui              variables de thème, socle, impression
│
├── modules/profile/
│   ├── contract/  @ns-studio/profile-contract     types · valideProfile() · profile.fr.json
│   ├── ui/        @ns-studio/profile-ui           la page Angular
│   └── api/       @ns-studio/profile-api          les routes Hono
│
└── apps/
    ├── api/       @ns-studio/api             le Worker : monte les routes des modules
    ├── profile/   @ns-studio/profile-app     le micro front-end profil
    └── web/       @ns-studio/web             la shell Angular : navigation + remotes
```

`contract/` est importé par l'API et par l'application profile. La shell, elle, ne compile pas le
module : elle embarque simplement `/remotes/profile/`.

> `apps/api` n'a ni `tsc`, ni `dist/`, ni script `build` — wrangler compile le TypeScript du
> Worker lui-même.

---

## 2. Développer en local

```bash
npm ci
npm run dev
```

- l'API sur `http://localhost:8787`
- la shell sur `http://localhost:4200`
- le micro front-end profile sur `http://localhost:4201`

La shell proxifie `/remotes/profile/` vers 4201, et les deux fronts proxifient `/api` vers 8787.

### Pourquoi un serveur Node et non `wrangler dev`

En production l'API tourne dans le runtime Cloudflare (workerd). En local, `apps/api/src/dev-node.ts`
la sert sous Node — **parce que workerd exige macOS 13.5 ou plus, et refuse de démarrer en
dessous** (ce dépôt a été écrit sur macOS 12.6).

Ce n'est pas une seconde implémentation : ce fichier importe le **même objet `app`** que le
Worker. Mêmes routes, même code, mêmes réponses. Seul le runtime diffère.

Ce que le serveur Node ne reproduit pas, c'est le service des fichiers statiques et l'aiguillage
`run_worker_first`, qui viennent de `wrangler.jsonc`. Pour les éprouver :

```bash
npx wrangler dev --remote   # exécute sur l'infrastructure Cloudflare : pas de workerd local
```

Sur macOS 13.5+, `npx wrangler dev` fonctionne normalement et reste le moyen le plus fidèle.

---

## 3. Mettre le profil à jour

Un seul fichier : **`modules/profile/contract/src/data/profile.fr.json`**. L'éditer, c'est une pull request.

```bash
npm test    # valide le contenu : dates, sections obligatoires, ordre antéchronologique
```

La CI passe ce test avant tout déploiement : un profil cassé ne peut pas arriver en ligne.

### Données personnelles — un choix, pas un oubli

Le profil papier porte une adresse postale, un téléphone, une date de naissance, un état civil et une
nationalité. **Rien de tout cela n'est publié ici**, et le type `Profil` ne prévoit même pas de
champ pour les accueillir.

La page est publique et le dépôt aussi : ces informations seraient indexées et moissonnées. En
France, elles sont de toute façon déconseillées sur un profil, car elles ouvrent la porte à la
discrimination. Seule l'adresse électronique est affichée.

---

## 4. Ajouter un module

Quatre gestes, et rien d'autre :

| Où                               | Quoi                                                        |
| -------------------------------- | ----------------------------------------------------------- |
| `apps/<nom>/`                    | L'application Angular remote, avec son propre build         |
| `modules/<nom>/`                 | Le dossier : `contract/`, `ui/`, `api/`                     |
| `apps/api/src/index.ts`          | Une ligne : `app.route('/api/<nom>', routes<Nom>)`          |
| `apps/web/src/app/app.routes.ts` | Une entrée shell vers `/remotes/<nom>/`                     |
| `scripts/compose-remotes.mjs`    | Une entrée pour copier le build dans les assets de la shell |

Pas de nouveau dépôt, pas de nouveau secret, pas de nouveau domaine.

---

## 5. Déployer

Le déploiement est automatique : **tout push sur `main` met le site à jour.**

Prérequis, à faire une seule fois :

1. Un compte Cloudflare, et un token API créé avec le modèle _Edit Cloudflare Workers_.
2. Ce token posé en secret `CLOUDFLARE_API_TOKEN`, dans
   _Settings → Secrets and variables → Actions_.

Pour déployer à la main :

```bash
npm run deploy
```

---

## 6. Les commandes

| Commande              | Effet                                            |
| --------------------- | ------------------------------------------------ |
| `npm run dev`         | API + profile + shell, en parallèle              |
| `npm run dev:api`     | L'API seule, sur 8787                            |
| `npm run dev:profile` | Le micro front-end profile seul, sur 4201        |
| `npm run dev:web`     | La shell seule, sur 4200                         |
| `npm test`            | Valide le contenu du profil et le validateur     |
| `npm run build`       | Contrat, profile remote, shell, puis composition |
| `npm run deploy`      | Build, puis `wrangler deploy`                    |
| `npm run format`      | Prettier sur tout le dépôt                       |

---

## 7. La pile

Angular 22 (zoneless, signaux, `httpResource`) · Hono 4 · Cloudflare Workers · TypeScript 6 ·
workspaces npm · GitHub Actions.

Aucune bibliothèque de composants, aucun framework CSS : le thème sombre et la version
imprimable tiennent en deux feuilles de style dans `@ns-studio/ui`. **Cmd+P produit un PDF propre —
il n'y a pas de bouton « télécharger » à maintenir.**
