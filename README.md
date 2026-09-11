# latelier

Plateforme personnelle de Nathan SENG. **Un seul Worker Cloudflare, une shell Angular, des micro front-ends indépendants.**
Le premier module est le CV.

**En ligne : <https://latelier.latech.workers.dev>**

```
                        Navigateur du visiteur
                                  │
   ┌──────────────────────────────▼───────────────────────────────────┐
   │            UN SEUL Cloudflare Worker — un seul déploiement       │
   │                                                                  │
   │   run_worker_first: ["/api/*"]      ◄── l'aiguillage, 1 ligne    │
   │                                                                  │
   │   /api/cv  ──►  Hono  ──►  @latelier/cv-contract  ──►  cv.fr.json   │
   │                                                                  │
   │   /*       ──►  Static Assets  ──►  shell + /remotes/cv/       │
   │                 not_found_handling: "single-page-application"    │
   └──────────────────────────────────────────────────────────────────┘
```

Front **et** API partent ensemble : une seule origine, donc **aucun CORS à configurer**.

---

## 1. La structure

Un **module** est une tranche verticale : son contrat, son interface et ses routes vivent dans le
même dossier, et bougent ensemble.

```
latelier/
├── .nvmrc                       22.23.2
├── wrangler.jsonc               assets + run_worker_first
├── .github/workflows/ci.yml     build → tests → déploiement
│
├── packages/
│   └── ui/        @latelier/ui              variables de thème, socle, impression
│
├── modules/cv/
│   ├── contract/  @latelier/cv-contract     types · valideCv() · cv.fr.json
│   ├── ui/        @latelier/cv-ui           la page Angular
│   └── api/       @latelier/cv-api          les routes Hono
│
└── apps/
    ├── api/       @latelier/api             le Worker : monte les routes des modules
    └── web/       @latelier/web             la coquille Angular : routes paresseuses
```

`contract/` est importé **des deux côtés**. L'interface et l'API ne peuvent pas diverger : le
compilateur l'interdit.

> `apps/api` n'a ni `tsc`, ni `dist/`, ni script `build` — wrangler compile le TypeScript du
> Worker lui-même.

---

## 2. Développer en local

```bash
npm ci
npm run dev
```

- l'API sur `http://localhost:8787`
- l'interface sur `http://localhost:4200`, qui proxifie `/api` vers 8787

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

## 3. Mettre le CV à jour

Un seul fichier : **`modules/cv/contract/src/data/cv.fr.json`**. L'éditer, c'est une pull request.

```bash
npm test    # valide le contenu : dates, sections obligatoires, ordre antéchronologique
```

La CI passe ce test avant tout déploiement : un CV cassé ne peut pas arriver en ligne.

### Données personnelles — un choix, pas un oubli

Le CV papier porte une adresse postale, un téléphone, une date de naissance, un état civil et une
nationalité. **Rien de tout cela n'est publié ici**, et le type `Profil` ne prévoit même pas de
champ pour les accueillir.

La page est publique et le dépôt aussi : ces informations seraient indexées et moissonnées. En
France, elles sont de toute façon déconseillées sur un CV, car elles ouvrent la porte à la
discrimination. Seule l'adresse électronique est affichée.

---

## 4. Ajouter un module

Trois gestes, et rien d'autre :

| Où                               | Quoi                                                                 |
| -------------------------------- | -------------------------------------------------------------------- |
| `modules/<nom>/`                 | Le dossier : `contract/`, `ui/`, `api/`                              |
| `apps/api/src/index.ts`          | Une ligne : `app.route('/api/<nom>', routes<Nom>)`                   |
| `apps/web/src/app/app.routes.ts` | Une entrée `loadComponent` — plus le chemin dans `tsconfig.app.json` |

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

| Commande          | Effet                                    |
| ----------------- | ---------------------------------------- |
| `npm run dev`     | API + interface, en parallèle            |
| `npm run dev:api` | L'API seule, sur 8787                    |
| `npm run dev:web` | L'interface seule, sur 4200              |
| `npm test`        | Valide le contenu du CV et le validateur |
| `npm run build`   | Contrat, puis interface Angular          |
| `npm run deploy`  | Build, puis `wrangler deploy`            |
| `npm run format`  | Prettier sur tout le dépôt               |

---

## 7. La pile

Angular 22 (zoneless, signaux, `httpResource`) · Hono 4 · Cloudflare Workers · TypeScript 6 ·
workspaces npm · GitHub Actions.

Aucune bibliothèque de composants, aucun framework CSS : le thème sombre et la version
imprimable tiennent en deux feuilles de style dans `@latelier/ui`. **Cmd+P produit un PDF propre —
il n'y a pas de bouton « télécharger » à maintenir.**
