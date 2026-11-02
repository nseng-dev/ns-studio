# Rapport d'audit — ns-studio

|                   |                                                                                           |
| ----------------- | ----------------------------------------------------------------------------------------- |
| **Dépôt**         | `nseng-dev/ns-studio` (public)                                                            |
| **Commit audité** | `2e97a59` — `main`, `origin/main` et `claude/dev` alignés                                 |
| **Production**    | <https://ns.latech.workers.dev> — en ligne, HTTP 200                                      |
| **Date**          | 2026-11-02                                                                                |
| **Volume**        | 57 fichiers suivis, **2 465 lignes** de source (hors `package-lock.json`)                 |
| **Mode**          | Lecture seule. Aucun fichier modifié, aucun build, aucun test exécuté, aucun déploiement. |

**Convention de preuve** — ✅ Fait vérifié (fichier:ligne ou sortie de commande) · ⚠️ Hypothèse argumentée · ❓ À trancher avec toi.

---

## 1. Résumé exécutif

Le dépôt est un **portfolio/CV en lecture seule**, pas un éditeur de CV : il n'existe ni écriture, ni authentification, ni back-office — une seule route `GET /api/profile` sert un JSON versionné dans le dépôt (`apps/api/src/index.ts:17`, `modules/profile/api/src/index.ts:21`). Le code est propre, court, strictement typé et remarquablement commenté ; l'architecture en tranches verticales (`contract` / `ui` / `api`) est saine. Mais **la chaîne de livraison est cassée en profondeur** : les 7 exécutions de la CI ont échoué, sans exception, parce que `package-lock.json` ne contient que les binaires natifs macOS — `npm ci` ne peut pas construire le projet sur Linux. La production tourne donc sur un build poussé à la main depuis ce Mac, identique octet pour octet au `dist/` local non versionné. Enfin, le choix du micro front-end **par iframe** casse l'impression PDF annoncée dans le README (95 % du contenu hors cadre) et vide la page de tout contenu indexable.

**3 points forts** — contrat de données unique partagé API/front avec validateur maison et 7 tests ✅ ; réactivité 100 % signaux, **zéro RxJS** dans le code, donc zéro fuite de souscription ✅ ; documentation (`README`, `AGENTS.md`, `PROJECT_MEMORY.md`) d'une qualité rare pour un projet de cette taille ✅.

**3 problèmes majeurs** — 🔴 lockfile macOS-only ⇒ CI 0/7 et déploiement non reproductible ; 🔴 aucune garde automatique avant la production alors que le README promet le contraire ; 🟠 l'iframe casse l'impression, le défilement et le référencement.

---

## 2. Tableau de notes

| Axe             |  Note   | Justification en une ligne                                                                                                                                                        |
| --------------- | :-----: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Architecture    | **3/5** | Découpage `contract`/`ui`/`api` exemplaire, mais le micro front-end par iframe coûte l'impression, le SEO et le défilement pour une isolation dont 2 465 lignes n'ont pas besoin. |
| Qualité du code | **4/5** | `strict` partout, Prettier 100 % conforme, commentaires explicatifs ; mais aucun linter, configs dupliquées et le TypeScript du Worker n'est typé-vérifié nulle part.             |
| Tests           | **2/5** | 7 tests, tous sur le validateur du contrat ; 0 test d'API, 0 test Angular, 0 e2e — donc rien ne couvre ce qui est réellement tombé en panne.                                      |
| Sécurité        | **3/5** | Aucun secret commité, surface d'attaque quasi nulle (un seul GET public) ; mais **zéro en-tête de sécurité** en production et un `bypassSecurityTrustResourceUrl` latent.         |
| Déploiement     | **1/5** | **7 échecs sur 7** en CI depuis la création ; `npm ci` impossible sur Linux ; la prod a été poussée manuellement depuis un seul poste.                                            |
| Documentation   | **4/5** | README et AGENTS.md excellents et pédagogiques, mais ils décrivent un déploiement automatique qui n'a jamais fonctionné et un PDF propre qui ne l'est pas.                        |

---

## 3. Constats détaillés

### 3.1 Vue d'ensemble

✅ **Rôle réel de l'application.** Afficher une page de profil professionnel unique, en français, servie par un Worker Cloudflare qui sert aussi les assets. Ce n'est **pas** un éditeur : aucune route d'écriture, aucun formulaire, aucune session (`apps/api/src/index.ts:15-29` — l'application Hono entière).

✅ **Fonctionnalités réellement présentes**, vérifiées en lecture et sur la prod :

| Fonctionnalité                                                                                   | Preuve                                                                                                                     |
| ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| Page profil (7 sections : en-tête, expériences, formation, compétences, langues, intérêts, pied) | `modules/profile/ui/src/profile-page.html:11-146`                                                                          |
| `GET /api/profile` renvoyant le profil validé                                                    | `modules/profile/api/src/index.ts:21-37` ; prod : `HTTP 200`, `content-length: 3364`, `cache-control: public, max-age=300` |
| 404 JSON sur route API inconnue                                                                  | `apps/api/src/index.ts:25-27` ; prod : `GET /api/inconnue` → `{"code":"ROUTE_INCONNUE",…}` + `HTTP 404`                    |
| Repli SPA (recharger `/profile` ne fait pas 404)                                                 | `wrangler.jsonc:22` ; prod : `HEAD /profile` → `HTTP 200`                                                                  |
| États chargement / erreur / réessai                                                              | `profile-page.html:1-9`                                                                                                    |
| Thème clair + sombre automatique                                                                 | `packages/ui/src/tokens.scss:91-110`                                                                                       |
| Feuille d'impression A4                                                                          | `packages/ui/src/base.scss:85-102` — **mais inopérante depuis la shell, cf. §3.3**                                         |
| Responsive < 820 px                                                                              | `modules/profile/ui/src/profile-page.scss:444-483`                                                                         |
| Fond animé (halos + points dérivants)                                                            | `profile-page.scss:30,63,66-107`, désactivé en `prefers-reduced-motion` (`:485-490`)                                       |

❌ **Fonctionnalités absentes malgré ce que le nom « éditeur de CV » suggère** : édition, authentification, multi-utilisateur, multi-CV, choix de template, bouton d'export PDF, internationalisation (le français est codé en dur dans le fichier de données et dans `MOIS` à `profile-page.ts:7-20`).

✅ **Arborescence commentée (3 niveaux, fichiers suivis uniquement).**

```
ns-studio/
├── wrangler.jsonc                 Worker « ns » + assets + run_worker_first ["/api/*"]  (34 l.)
├── tsconfig.base.json             Base TS stricte — étendue par le SEUL contrat (cf. §3.7)
├── package.json                   npm workspaces : packages/* · modules/*/* · apps/*
├── .github/workflows/ci.yml       build → test → deploy — 0 succès sur 7 (cf. §3.8)
│
├── packages/ui/                   @ns-studio/ui — socle visuel, livré en SCSS brut
│   └── src/tokens.scss (135 l.)   thème Angular Material + variables --ns-* clair/sombre/impression
│       base.scss      (103 l.)    reset, focus, @page A4
│
├── modules/profile/               la tranche verticale « profil »
│   ├── contract/                  @ns-studio/profile-contract — SEUL paquet avec un build tsc
│   │   ├── src/contract.ts (100 l.)   les 8 interfaces du modèle
│   │   ├── src/valide.ts   (176 l.)   validateur maison, sans dépendance
│   │   ├── src/profile.ts   (27 l.)   lireProfile() — la charnière vers la source de données
│   │   ├── src/data/profile.fr.json (155 l.)  LE contenu, en dur dans le bundle
│   │   └── test/profile.test.ts (114 l.)      7 tests node:test — la seule suite du dépôt
│   ├── ui/                        @ns-studio/profile-ui — composants livrés en SOURCE (pas de build)
│   │   └── src/profile-page.{ts,html,scss}    51 / 147 / 517 lignes
│   └── api/                       @ns-studio/profile-api — routes Hono, livrées en source
│       └── src/index.ts (38 l.)   l'unique endpoint
│
└── apps/
    ├── api/      le Worker. Ni tsconfig, ni build : wrangler compile le TS lui-même
    │   ├── src/index.ts     (29 l.)  monte les routes, filet 404
    │   └── src/dev-node.ts  (31 l.)  même objet `app` servi sous Node (contournement workerd/macOS 12.6)
    ├── profile/  micro front-end Angular autonome → /remotes/profile/
    └── web/      la shell Angular : barre de navigation + <iframe> vers le remote
```

⚠️ **Le découpage est plus ambitieux que le contenu.** 6 paquets npm, 2 applications Angular, 1 script de composition et 1 Worker pour **une seule page statique de 2 465 lignes**. Le README assume ce choix (« ajouter un module = 4 gestes », `README.md:115-127`), mais aucun second module n'existe pour prouver que l'abstraction tient : `scripts/compose-remotes.mjs:7-13` ne contient qu'une entrée.

---

### 3.2 Stack et versions

✅ **Pile.** Angular 22.1.6 (standalone, zoneless, signaux, `httpResource`) · Hono 4.13.7 · Cloudflare Workers (`compatibility_date: 2026-09-10`) · TypeScript 6.0.3 · **npm workspaces** (`package.json:10-14`) · GitHub Actions. Node imposé à `22.23.2` par `.nvmrc`.

🔴 **Node local en écart avec `.nvmrc`.** `node -v` renvoie **v24.19.0**, alors que `.nvmrc:1` exige `22.23.2` — et `PROJECT_MEMORY.md:71` note explicitement que « Node 24 a deja provoque des erreurs Angular ». Tout build lancé maintenant sans `nvm use` part sur la mauvaise version.

✅ **Obsolescence — modérée et sans saut majeur** (`npm outdated`) :

| Paquet                                         | Installé | Dernier    | Écart                                        |
| ---------------------------------------------- | -------- | ---------- | -------------------------------------------- |
| `@angular/*` (core, common, router, compiler…) | 22.1.6   | 22.2.4     | mineur                                       |
| `@angular/build`, `@angular/cli`               | 22.1.8   | 22.2.5     | mineur                                       |
| `@angular/material`, `@angular/cdk`            | 22.1.6   | 22.2.5     | mineur                                       |
| `hono`                                         | 4.13.7   | 4.13.16    | correctif                                    |
| `wrangler`                                     | 4.131.0  | 4.156.1    | mineur                                       |
| `@hono/node-server`                            | 2.1.1    | 2.1.5      | correctif                                    |
| `typescript`                                   | 6.0.3    | **7.0.2**  | **majeur**                                   |
| `@types/node`                                  | 22.20.2  | **26.6.6** | **majeur** (volontaire : aligné sur Node 22) |
| `concurrently`                                 | 9.2.4    | **10.0.6** | **majeur**                                   |

✅ **Vulnérabilités — `npm audit` : 21 au total (5 critiques, 11 élevées, 5 modérées).** La ventilation compte plus que le total :

- **Aucune n'est exposée en production.** Le Worker déployé n'embarque que `hono` et le JSON du contrat. Les paquets critiques (`piscina`, `shell-quote`/`concurrently`, `vite`, `proxy-addr`, `sharp`, `undici`, `miniflare`) sont tous dans la **chaîne de build ou de développement**.
- Deux avis touchent des dépendances d'exécution mais **sur du code non utilisé ici** : `hono` (modéré) et `@hono/node-server` (modéré) concernent `serveStatic`, jamais appelé — les assets sont servis par Cloudflare, pas par Hono (`wrangler.jsonc:16-29`). `@angular/router` (élevé) ne concerne que le rendu côté serveur (SSR), absent du projet (`angular.json` n'a ni cible `server`, ni `prerender`).

⚠️ **À retenir** : la surface réelle est faible, mais `npm audit` restera bruyant tant qu'il n'y a pas de politique (`audit-level`, `--omit=dev`) — il ne peut donc pas servir de garde en CI en l'état.

---

### 3.3 Front

✅ **Deux applications Angular distinctes, toutes deux standalone et zoneless.**

- `apps/web` — la shell : en-tête, navigation, `<router-outlet />` (`apps/web/src/app/app.ts:12-28`). Aucun `provideZoneChangeDetection` (`app.config.ts:9-12`) : zoneless par défaut.
- `apps/profile` — le remote : bootstrape `ProfileRemoteApp` qui n'affiche que `<ns-profile />` (`apps/profile/src/app/profile-remote-app.ts:8`).

✅ **Routing — 4 routes, toutes sur le profil** (`apps/web/src/app/app.routes.ts:9-23`) : `/profile` (chargement différé de `RemoteFrame`), `''` → `/profile`, `/cv` → `/profile` (compatibilité de l'ancien nom), `**` → `/profile`. `withInMemoryScrolling` + `withComponentInputBinding` activés (`app.config.ts:17-22`).

✅ **Gestion d'état — 100 % signaux, zéro RxJS.** `git grep -nE "rxjs|Observable|subscribe\(|takeUntil"` sur `apps/`, `modules/`, `packages/` ne remonte que deux lignes, et ce sont des déclarations de dépendance (`apps/web/package.json:20`, `apps/profile/package.json:21`) — **aucun import, aucune souscription, dans aucun fichier source**.

> **Conséquence directe sur ta question « fuites de subscriptions / opérateurs mal utilisés » : il n'y en a aucune, et il ne peut pas y en avoir.** `rxjs` reste légitimement déclaré car c'est une `peerDependency` d'`@angular/core`. L'état tient en trois primitives : `httpResource` (`modules/profile/ui/src/profile-api.ts:18`), deux `computed` (`profile-page.ts:40,43`) et un `computed` (`remote-frame.ts:15`).

🟢 **Un `computed` inutile.** `profile-page.ts:40` — `computed(() => this.ressource.value())` ne fait que relire un signal déjà exposé ; `this.ressource.value` suffirait. Sans conséquence, mais c'est une indirection gratuite.

🟠 **Le micro front-end est une `<iframe>`, pas du Module Federation.** `apps/web/src/app/remote-frame/remote-frame.html:1-7` : la shell injecte `<iframe src="/remotes/profile/index.html">`. La composition est un simple `cp` au moment du build (`scripts/compose-remotes.mjs:15-22`). **Trois conséquences mesurées sur la production** :

```
mesure live sur https://ns.latech.workers.dev/profile (javascript_tool) :
  iframe (boîte)            225 px   ← la hauteur de la fenêtre (100dvh)
  contenu du remote       4 467 px
  document shell            289 px
  outerCanScroll: true  +  innerCanScroll: true   ← double barre de défilement
  ratioClipped: 0.95
```

1. 🔴 **L'impression PDF annoncée est cassée.** `README.md:171` promet : « Cmd+P produit un PDF propre — il n'y a pas de bouton « télécharger » à maintenir ». Or Cmd+P sur `/profile` imprime le **document shell**, dans lequel l'iframe est une boîte de `100dvh` (`remote-frame.scss:8-9`) sans règle `@media print`. Les navigateurs n'étendent pas une iframe à la hauteur de son contenu à l'impression : **95 % du profil (4 467 px pour 225 px de boîte) tombe hors cadre**. Toutes les règles d'impression soignées (`base.scss:85-102`, `profile-page.scss:492-516`) vivent dans le document interne, le seul qui ne pagine pas. ⚠️ _Hypothèse sur le rendu exact du PDF — la géométrie est mesurée, le comportement d'impression des iframes imbriquées est documenté mais je ne l'ai pas capturé en PDF ; c'est le premier e2e à écrire._
2. 🟠 **Double défilement.** Le document externe et l'interne défilent tous deux (mesure ci-dessus), avec l'en-tête `position: sticky` de la shell (`app.ts:48-50`) figé en dehors de la zone qui défile réellement.
3. 🟠 **SEO et partage à zéro contenu.** Le HTML servi sur `/` ne contient que `<ns-root></ns-root>` (`apps/web/src/index.html:36`). Le texte du profil n'est dans aucun des deux documents au chargement — il arrive par `fetch` **dans l'iframe**. Les méta `og:` soignées (`index.html:15-27`) décrivent donc une page vide.

🟢 **Redirection superflue à chaque chargement.** L'iframe vise `/remotes/profile/index.html` (`app.routes.ts:16`), or la prod répond `HTTP 307 → /remotes/profile/`. Un aller-retour réseau par visite, évitable en pointant directement le dossier.

✅ **Système de templates de CV : il n'y en a pas.** Un seul gabarit, codé en dur (`profile-page.html`), avec sa feuille de 517 lignes (`profile-page.scss`). Aucune notion de thème, variante ou mise en page sélectionnable. ⚠️ _Si la restructuration vise un vrai éditeur multi-template, c'est à écrire intégralement — rien n'est réutilisable au-delà des tokens SCSS._

✅ **Export PDF : aucun code.** Pas de `jsPDF`, `puppeteer`, `html2canvas`, ni bouton. La stratégie est 100 % CSS d'impression — stratégie défendable, mais actuellement inopérante (point 1 ci-dessus).

🟢 **Deux champs modélisés, validés, stylés… et jamais remplis.** `technologies` est typé (`contract.ts:54`), validé (`valide.ts:139`), rendu en `mat-chip-set` (`profile-page.html:69-75`) et stylé (`profile-page.scss:366-380`) — **0 expérience sur 7 en porte**. Idem pour `profil.liens` : rendu (`profile-page.html:37-39`), validé (`valide.ts:115-127`), **tableau vide** en prod. Du code vivant sans donnée.

---

### 3.4 Back / API

✅ **Framework** : Hono 4.13.7, monté dans un Worker Cloudflare. `apps/api/src/index.ts` ne contient **aucune logique métier** — uniquement le montage et le filet 404.

✅ **Inventaire exhaustif des endpoints — il y en a deux, dont un filet :**

| Méthode    | Route            | Rôle                  | Réponses                                                                                                               | Preuve                                   |
| ---------- | ---------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `GET`      | `/api/profile`   | Profil complet validé | `200` + JSON `Profile`, en-tête `Cache-Control: public, max-age=300` · `500` + `ErreurApi` si le JSON viole le contrat | `modules/profile/api/src/index.ts:21-37` |
| _(toutes)_ | `/api/*` inconnu | Filet anti-HTML       | `404` + `{code:'ROUTE_INCONNUE', message}`                                                                             | `apps/api/src/index.ts:25-27`            |

Tout le reste (`/`, `/profile`, `/remotes/*`) ne touche jamais le Worker : `run_worker_first: ["/api/*"]` réserve le Worker à l'API, le reste part du stockage d'assets (`wrangler.jsonc:28`).

✅ **Validation des entrées.** Il n'y a **aucune entrée utilisateur** : pas de corps, pas de paramètre de requête, pas de paramètre de chemin lu par le code. La validation existante porte sur la **sortie** — `valideProfile()` vérifie le JSON avant de le servir (176 lignes, `valide.ts`), avec accumulation de toutes les erreurs plutôt qu'échec au premier problème (`valide.ts:27-77`). C'est inhabituel et c'est bien vu : le risque réel de ce projet est un contenu cassé, pas une requête hostile.

✅ **Gestion des erreurs.** Corps d'erreur uniforme typé (`ErreurApi`, `contract.ts:96-99`). Un profil invalide donne un `500`, pas un `400` — justifié en commentaire : le visiteur n'y est pour rien (`modules/profile/api/src/index.ts:16-19`). Le détail des règles violées est volontairement exposé car le contenu est public.

⚠️ **Deux imprécisions dans les commentaires** (sans effet à l'exécution) : `valide.ts:97-98` annonce « 503 côté API » alors que le code renvoie `500` ; `contract.ts:95` dit « Un seul code aujourd'hui » alors que `ROUTE_INCONNUE` existe aussi et **n'est pas dans le type** `ErreurApi['code']` (`contract.ts:97`) — le 404 d'`apps/api/src/index.ts:26` n'est donc pas typé par le contrat.

❌ **Authentification : aucune, nulle part.** Pas de middleware, pas de token, pas de session. Cohérent avec une page publique en lecture seule — **mais c'est exactement ce qu'il faudra construire si le projet devient un éditeur.**

🟠 **Le TypeScript du Worker n'est typé-vérifié par personne.** Vérifié : aucun `tsconfig` n'inclut `apps/api/src/**` ni `modules/profile/api/src/**` (`grep '"include"\|"files"'` sur tous les `tsconfig*.json` → seuls `contract` et les deux `src/main.ts` Angular sont couverts). `apps/api` n'a d'ailleurs pas de `tsconfig` du tout (`ls apps/api` → `package.json`, `src`). Wrangler compile ce TypeScript avec esbuild, qui **efface les types sans les vérifier**. Une erreur de type dans le Worker passerait `npm run build` **et** `wrangler deploy --dry-run` sans un mot. _(Contrôle ad hoc lancé pendant l'audit : le code actuel est sain — c'est le filet qui manque, pas le code.)_

---

### 3.5 Données

✅ **Stockage : aucun.** `wrangler.jsonc` ne déclare **ni D1, ni KV, ni R2, ni Durable Object, ni Hyperdrive, ni queue** — le seul binding est `ASSETS` (`wrangler.jsonc:24`). Le contenu est un fichier JSON **compilé dans le bundle du Worker** via `import … with { type: 'json' }` (`modules/profile/contract/src/profile.ts:13`), mémoïsé en mémoire d'isolat (`profile.ts:17,26`).

> **Conséquence structurante : modifier le CV exige un redéploiement.** C'est assumé et documenté (`README.md:93-101`), et `profile.ts:1-11` identifie correctement `lireProfile()` comme la charnière à changer le jour où une base arrive. **Pour un éditeur, c'est le premier mur à franchir.**

✅ **Schéma / modèle de données d'un CV** — 8 interfaces, toutes `readonly`, dans `contract.ts` :

```
Profile                          ← le corps exact de GET /api/profile
├─ profil: Profil                nom · titre · accroche · localisation · email? · permis? · liens[]
│   └─ liens: Lien[]             libelle · url (https:// obligatoire)
├─ experiences: Experience[]     debut(MM/AAAA) · fin(MM/AAAA | "aujourd'hui") · poste ·
│                                entreprise · lieu? · details[]? · technologies[]?
├─ formations: Formation[]       debut(AAAA) · fin(AAAA) · intitule · precision? · etablissement
├─ competences: GroupeCompetences[]   libelle · items[]
├─ langues: Langue[]             langue · niveau
├─ interets: Interet[]           libelle · details
└─ misAJour: string              AAAA-MM
```

✅ **Choix de modélisation notables.** Les dates sont des **chaînes** `MM/AAAA`, pas des `Date` — justifié : jamais calculées, seulement affichées (`contract.ts:8-9`). Trois expressions régulières les gardent (`valide.ts:80-84`). L'ordre d'affichage **vient du fichier**, pas d'un tri — d'où un test dédié (`test/profile.test.ts:17-34`).

✅ **Absence volontaire de données personnelles sensibles.** Ni adresse postale, ni téléphone, ni date de naissance, ni nationalité : le type ne prévoit même pas de champ (`contract.ts:18-25`, `README.md:103-111`). Décision documentée et respectée dans les données. 🟢 Nuance : `permis` (`contract.ts:34`) est renseigné et affiché, ce qui entre en tension légère avec cette doctrine — ❓ à trancher.

✅ **Migrations : aucune, et aucune n'est nécessaire** — il n'y a pas de base. Le « schéma » n'est versionné que par Git et gardé par `valideProfile()`.

🟠 **Le contenu est périmé d'environ 5 ans.**

```
misAJour              : 2021-09      ← affiché en pied de page : « Contenu mis à jour en septembre 2021 »
expérience la plus récente : 02/2020 → 07/2021
formations             : s'arrêtent en 2019
technologies renseignées  : 0 / 7 expériences
liens (GitHub, LinkedIn…) : 0
```

Le dépôt, lui, date de 2026-09. ⚠️ _Un portfolio public qui annonce « mis à jour en septembre 2021 » et n'affiche aucun lien dessert son objet — c'est le plus gros écart entre l'effort technique investi et le résultat visible._

---

### 3.6 Cloudflare et déploiement

✅ **`wrangler.jsonc` — 34 lignes, très commentées, et correctes.** Worker `ns` (→ `ns.latech.workers.dev`, le sous-domaine `latech` étant réglé au tableau de bord) ; point d'entrée TypeScript direct (`apps/api/src/index.ts`) ; `compatibility_date: 2026-09-10` ; assets depuis `./apps/web/dist/web/browser` ; `not_found_handling: "single-page-application"` ; `run_worker_first: ["/api/*"]` ; `observability.enabled: true`.

✅ **Bindings** : un seul, `ASSETS` (`wrangler.jsonc:24`). Aucun `vars`, aucun secret de runtime, aucune base.

🟠 **Environnements : il n'y en a qu'un.** Aucun bloc `env.*` dans `wrangler.jsonc` → **pas de `preview`, pas de `staging`**. `main` pousse directement sur l'URL publique. ❓ _Pour automatiser le développement, c'est le manque le plus structurant après la CI._

✅ **Gestion des secrets — saine.** Un seul secret existe, `CLOUDFLARE_API_TOKEN`, et il n'est **référencé que par son nom** : `.github/workflows/ci.yml:56` (`${{ secrets.CLOUDFLARE_API_TOKEN }}`) et documenté à `README.md:136-139`. `git grep` sur `(api[_-]?key|secret|token|password|bearer|private[_-]?key)` hors `package-lock.json` ne remonte **aucune valeur**, uniquement des mentions de nom et du texte de documentation. `.gitignore:1-8` exclut `node_modules/`, `dist/`, `.angular/`, `.wrangler/`, `.vscode/`. `git status` : propre, zéro fichier non suivi.

🔴 **La procédure de déploiement réelle n'est pas celle qui est documentée.** `README.md:133` affirme : « Le déploiement est automatique : **tout push sur `main` met le site à jour.** » C'est faux depuis le premier jour :

```
gh run list -L 10  →  7 exécutions, 7 échecs (1 annulée), 0 succès
  35159630688  failure  Add repository guidance and project notes   2026-09-16
  34769808801  failure  Fix profile remote route                    2026-09-13
  34674806490  failure  Rename platform to Kinetiq profile          2026-09-12
  34561740630  failure  Le projet s'appelle « latelier »            2026-09-11
  34531059240  failure  Le Worker s'appelle « atelier »             2026-09-10
  34526923263  failure  Plateforme CV : Angular 22 + Hono…          2026-09-10
```

**L'étape de déploiement n'a donc jamais été atteinte.** ✅ **Preuve que la prod vient d'un build manuel** : le `dist/` local (non versionné, présent uniquement sur ce Mac) et la production servent exactement les mêmes empreintes de build, et les deux `index.html` sont **identiques au diff près de zéro ligne** :

```
live  https://ns.latech.workers.dev/  →  main-MYPEIG5F.js · chunk-BO7PRPI4.js · styles-T33H5HNF.css
local apps/web/dist/web/browser/index.html → mêmes trois fichiers
diff live/local index.html → IDENTIQUE
GET /api/profile en prod == modules/profile/contract/src/data/profile.fr.json → IDENTIQUE
```

⚠️ **Autrement dit : la seule reproduction de ce qui est en ligne est un dossier ignoré par Git, sur un seul poste.** Si ce Mac disparaît, il faut re-réussir un build qui échoue partout ailleurs.

---

### 3.7 Qualité

✅ **TypeScript en mode strict — partout, mais pas de la même façon.**

| Projet                     | `strict` | `noUncheckedIndexedAccess` | `noPropertyAccessFromIndexSignature` | `noImplicitReturns` | Étend `tsconfig.base.json` ? |
| -------------------------- | :------: | :------------------------: | :----------------------------------: | :-----------------: | :--------------------------: |
| `tsconfig.base.json`       |    ✅    |          ✅ `:8`           |                  ❌                  |         ❌          |              —               |
| `modules/profile/contract` |    ✅    |        ✅ (hérité)         |                  ❌                  |         ❌          |           ✅ `:2`            |
| `apps/web`                 |    ✅    |             ❌             |               ✅ `:6`                |       ✅ `:7`       |              ❌              |
| `apps/profile`             |    ✅    |             ❌             |               ✅ `:6`                |       ✅ `:7`       |              ❌              |
| `apps/api`                 |    —     |             —              |                  —                   |          —          |      **aucun tsconfig**      |

🟠 **`tsconfig.base.json` existe mais n'est étendu que par un paquet sur six.** Les deux applications Angular redéfinissent 13 options à l'identique au lieu d'hériter (`apps/web/tsconfig.json` et `apps/profile/tsconfig.json` sont **rigoureusement identiques** — `diff` → 0 ligne) et **perdent `noUncheckedIndexedAccess`** au passage. La base n'est donc pas une base : c'est un quatrième dialecte.

✅ **Strictness Angular maximale** : `strictTemplates`, `strictInjectionParameters`, `strictInputAccessModifiers`, `typeCheckHostBindings` activés dans les deux applications (`tsconfig.json:18-24`). `ChangeDetectionStrategy.OnPush` sur les 3 composants.

✅ **Vérification de types — passe.** `npx tsc -p modules/profile/contract/tsconfig.json --noEmit` → exit 0 ; `npx tsc -p apps/web/tsconfig.app.json --noEmit` → exit 0. (Rappel §3.4 : le Worker n'est couvert par aucun projet.)

✅ **Formatage — impeccable.** `npx prettier --check .` → _« All matched files use Prettier code style! »_, zéro écart sur 57 fichiers. Configuration : `printWidth: 100`, `singleQuote`, parser `angular` pour le HTML (`.prettierrc`).

🟠 **Lint : aucun.** `ls` → ni ESLint, ni Biome, ni oxlint, ni Stylelint. `git grep '"lint"'` sur tous les `package.json` → **aucun script**. Prettier formate, il ne détecte ni import inutilisé, ni variable morte, ni règle Angular (nommage de sélecteur, `@Injectable` orphelin, accessibilité des gabarits).

✅ **Tests — 7, tous verts, tous sur le même objet.** `node:test` + `tsx` (`package.json:26`), un seul fichier : `modules/profile/contract/test/profile.test.ts` (114 lignes). Dernière exécution observée (log CI `35159630688`, 2026-09-16) : `ok 1` à `ok 7`, **aucun échec**. _(Non ré-exécuté localement : tu m'as demandé l'autorisation préalable pour lancer des tests.)_

| #   | Ce qui est couvert                                                |
| --- | ----------------------------------------------------------------- |
| 1   | Le `profile.fr.json` du dépôt est valide                          |
| 2   | Les expériences sont antéchronologiques                           |
| 3   | Un objet vide est rejeté, chaque section manquante signalée       |
| 4   | `null`, `undefined`, `42`, `'texte'`, `[]` rejetés sans exception |
| 5   | Une date au mauvais format est rejetée                            |
| 6   | `"aujourd'hui"` accepté en date de fin                            |
| 7   | Un lien non-`https://` est rejeté                                 |

🔴 **Ce que les tests ne couvrent pas — c'est-à-dire presque tout ce qui peut casser :** 0 test sur les routes Hono (le `500`, le `404 ROUTE_INCONNUE`, l'en-tête `Cache-Control`), 0 test de composant Angular, 0 test du rendu, 0 e2e, 0 test du script `compose-remotes.mjs`, 0 test du repli SPA ni de `run_worker_first`. **Les 7 échecs de CI n'auraient été attrapés par aucun test** — ils viennent de l'installation, en amont.

✅ **Code mort et duplications** (sur 2 465 lignes, le bilan est honnête) :

| Constat                                                                                        | Preuve                                                                    | Gravité |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------- |
| `apps/web/tsconfig.json` ≡ `apps/profile/tsconfig.json` (27 l. dupliquées)                     | `diff` → 0 ligne                                                          | 🟠      |
| `angular.json` dupliqué à 95 % (14 lignes de diff sur 55, dont 4 sont le seul nom du projet)   | `diff`                                                                    | 🟢      |
| `proxy.conf.json` : le bloc `/api` est répété dans les deux apps                               | `apps/web/proxy.conf.json:2-6` ≡ `apps/profile/proxy.conf.json:2-6`       | 🟢      |
| `technologies` : typé, validé, rendu, stylé — **0 donnée**                                     | §3.3                                                                      | 🟢      |
| `profil.liens` : validé et rendu — **tableau vide**                                            | §3.3                                                                      | 🟢      |
| `@ns-studio/profile-contract` est déclaré par `apps/profile` mais jamais importé par son code  | `apps/profile/package.json:18` vs aucun import dans `apps/profile/src/**` | 🟢      |
| `@angular/cdk` + `@angular/material` déclarés en **dépendances de production du dépôt racine** | `package.json:38-41` — sentent le contournement de hoisting               | 🟢      |
| `computed` redondant                                                                           | `profile-page.ts:40`                                                      | 🟢      |
| `.angulardoc.json` et `.vscode/settings.json` (vide) traînent, ignorés par Git                 | `.gitignore:7-8` ; `PROJECT_MEMORY.md:95` le note déjà comme à trancher   | 🟢      |

---

### 3.8 CI/CD et workflow Git

✅ **Le workflow est bien écrit** (`.github/workflows/ci.yml`, 56 lignes) : `concurrency` avec `cancel-in-progress` (`:9-11`), `permissions: contents: read` (`:13-14`), Node depuis `.nvmrc` avec cache npm (`:26-29`), **tests avant build** (`:37-38`), `wrangler deploy --dry-run` sur les PR (`:46-48`), déploiement réservé à `main` (`:52-56`). Actions épinglées en majeur (`@v5`, `@v4`).

🔴 **Et pourtant il échoue à 100 %. Cause racine identifiée et confirmée.** Le log de l'exécution `35159630688` montre : `npm ci` ✅ → `npm test` ✅ (7/7) → `npm run build` 💥 avec, répété pour chaque fichier :

> `✘ [ERROR] Cannot find native binding. npm has a bug related to optional dependencies […] [plugin angular-compiler]`

**Le `package-lock.json` ne contient que des binaires natifs macOS.** Vérifié :

```
$ grep -oE '"node_modules/[^"]*(darwin|linux|win32)[^"]*"' package-lock.json | sort -u
  node_modules/@cloudflare/workerd-darwin-64
  node_modules/@esbuild/darwin-x64
  node_modules/@img/sharp-darwin-x64
  node_modules/@img/sharp-libvips-darwin-x64
  node_modules/@lmdb/lmdb-darwin-x64
  node_modules/@msgpackr-extract/msgpackr-extract-darwin-x64
  node_modules/@napi-rs/nice-darwin-x64
  node_modules/@oxc-parser/binding-darwin-x64
  node_modules/@parcel/watcher-darwin-x64
  node_modules/@rolldown/binding-darwin-x64
  node_modules/lightningcss-darwin-x64
  node_modules/vite/node_modules/@rolldown/binding-darwin-x64
  node_modules/wrangler/node_modules/@esbuild/darwin-x64
```

**Treize paquets natifs, treize fois `darwin`, zéro `linux`, zéro `win32`.** Alors que `oxc-parser` déclare bien ses 20 variantes de plateforme en `optionalDependencies` dans ce même lockfile, **seule `@oxc-parser/binding-darwin-x64` y est résolue** (`os: ['darwin'], cpu: ['x64']`). `npm ci` sur `ubuntu-latest` ne peut donc installer aucun binding : le compilateur Angular casse au premier fichier.

⚠️ **Portée réelle, plus large que la CI** : ce lockfile rend le projet **inconstructible sur Linux et sur Windows, et même sur un Mac Apple Silicon** (`darwin-x64` seulement, pas `darwin-arm64`). Il n'est pas seulement « la CI qui ne passe pas » : c'est **un seul poste au monde qui peut livrer ce projet**. ⚠️ _La cause de la génération d'un lockfile ainsi élagué (version de npm, `~/.npmrc`, `--no-optional`) reste à déterminer — `.npmrc` local absent, `npm config get os/cpu/omit` ne renvoie rien de forçant. C'est à reproduire au moment de la correction._

🔴 **Aucune protection de branche.** `gh api repos/nseng-dev/ns-studio/branches/main/protection` → `404 Branch not protected`. Rien n'empêche un push direct sur `main`, et puisque la CI échoue de toute façon, **aucune garde automatique ne protège la production — ni test, ni build, ni revue.**

⚠️ **La branche courante ne déclenche rien.** Le workflow écoute `push` sur `[main]` et `pull_request` (`ci.yml:4-6`). `claude/dev` est poussée sur `origin` mais sans PR ouverte : **aucun run n'est déclenché par le travail en cours**. Les trois branches (`main`, `origin/main`, `claude/dev`) pointent d'ailleurs toutes sur `2e97a59` — aucune divergence.

✅ **Conventions de commit — homogènes, mais sans norme explicite.** 15 commits, tous de `nara54`, entre 2026-09-10 et 2026-09-17. Style impératif court en anglais (`Fix visible profile background animation`), avec deux reliquats en français (`Le Worker s'appelle « atelier »`, `fd2f296`, `6b7acba`). Ni Conventional Commits, ni commitlint, ni `CONTRIBUTING.md`, ni gabarit de PR. `AGENTS.md:41` codifie correctement l'usage observé.

⚠️ **Historique de renommages encore visible.** `kinetiq` → `latelier` → `ns-studio` : le log CI du 2026-09-16 travaille encore dans `/home/runner/work/kinetiq/kinetiq`. Reliquats : la route de compatibilité `/cv` (`app.routes.ts:21`) et, en local, des artefacts `dist/cv.*` dans le contrat (ignorés par Git, donc sans impact sur le dépôt).

---

### 3.9 Sécurité

✅ **Secrets : aucun dans le code.** Voir §3.6 — `git grep` exhaustif, zéro valeur, uniquement des noms et de la documentation.

✅ **CORS : sans objet, et c'est voulu.** Front et API partagent une origine unique grâce à `run_worker_first` (`wrangler.jsonc:28`). Aucun middleware CORS, aucun en-tête `Access-Control-*` en production — **c'est la bonne réponse**, pas un oubli (`README.md:23`, `apps/api/src/index.ts:9`).

✅ **Injections : surface nulle aujourd'hui.** Aucune base de données, aucune requête, aucun `eval`, aucun `innerHTML`, aucun `shell`. Les gabarits Angular échappent par défaut. La seule donnée dynamique est le JSON du dépôt, validé avant d'être servi.

🟠 **`bypassSecurityTrustResourceUrl` — non exploitable aujourd'hui, mais à un refactoring près de l'être.** `apps/web/src/app/remote-frame/remote-frame.ts:15-17` désarme la sanitisation Angular sur la `src` d'une iframe, et cette `src` est une `input()` liée par `withComponentInputBinding()` (`app.config.ts:19`) — qui lie aussi **les paramètres de requête**.

J'ai vérifié l'ordre de fusion dans le routeur installé plutôt que de le supposer. `node_modules/@angular/router/fesm2022/_router-chunk.mjs:1973-1978` :

```js
data = { ...queryParams, ...params, ...data, ...(activatedRoute.resources || {}) };
```

✅ **`data` écrase `queryParams`.** La `src` statique de `app.routes.ts:16` gagne donc toujours : `/profile?src=javascript:…` est **sans effet**.

⚠️ **Mais la protection est accidentelle, pas intentionnelle** : elle tient entièrement au fait que `src` soit une clé de `data`. Le jour où un module est paramétré par l'URL (`/module/:nom`, ce que suggère `README.md:115-127`), la même ligne devient une injection d'iframe. ❓ _À arbitrer : valider la `src` contre une liste blanche de remotes plutôt que de la faire confiance par construction._

🟠 **Aucun en-tête de sécurité en production.** Réponse réelle de `HEAD https://ns.latech.workers.dev/` — en-têtes présents : `content-type`, `cache-control`, `cf-cache-status`, `report-to`, `nel`, `server`, `cf-ray`, `alt-svc`. **Absents :**

| En-tête manquant                      | Conséquence concrète ici                                                                      |
| ------------------------------------- | --------------------------------------------------------------------------------------------- |
| `Content-Security-Policy`             | Aucune défense en profondeur ; `frame-src 'self'` encadrerait aussi le point ci-dessus        |
| `X-Frame-Options` / `frame-ancestors` | **N'importe quel site peut encadrer le portfolio** (clickjacking, réappropriation de contenu) |
| `X-Content-Type-Options: nosniff`     | Reniflage de type MIME possible                                                               |
| `Referrer-Policy`                     | Référent complet fuité vers les liens sortants                                                |
| `Strict-Transport-Security`           | Pas de HSTS (atténué : `workers.dev` est en HTTPS seul)                                       |
| `Permissions-Policy`                  | Aucune restriction d'API navigateur                                                           |

⚠️ _Le risque est faible — un site public en lecture seule, sans session ni cookie, n'a rien à voler. Mais c'est un ajout de ~8 lignes dans le Worker, et l'absence de `frame-ancestors` est la seule qui porte une conséquence réelle._

🟢 **`rel="noopener"` sans `target="_blank"`.** `profile-page.html:38` : l'attribut est inerte puisque les liens s'ouvrent dans le même onglet. Sans danger, mais trompeur — et il manquera le jour où `target="_blank"` sera ajouté.

✅ **Données personnelles : traitées avec soin.** Voir §3.5 — absence volontaire et documentée des identifiants physiques. Seule l'adresse électronique est publiée, conformément à la doctrine annoncée (`contract.ts:18-25`).

---

### 3.10 Documentation

✅ **Trois documents, tous utiles, et de très bon niveau pour un dépôt de 2 465 lignes.**

| Fichier             | Lignes | Contenu                                                                                                                               | Jugement                                                                           |
| ------------------- | -----: | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `README.md`         |    171 | Schéma d'architecture ASCII, structure, dev local, mise à jour du profil, ajout d'un module, déploiement, tableau des commandes, pile | Pédagogique, explique le **pourquoi** (ex. `:73-89` sur workerd/macOS 12.6)        |
| `AGENTS.md`         |     47 | Guide contributeur : structure, commandes, style, tests, commits, PR, sécurité                                                        | Clair, opérationnel, décrit fidèlement l'existant                                  |
| `PROJECT_MEMORY.md` |     99 | Contexte, décisions (dont les noms abandonnés), architecture, travail réalisé, points sensibles, à-faire                              | Excellent pour reprendre le projet ; `:92-99` est déjà une feuille de route lucide |

✅ **Les commentaires de code valent de la documentation** et expliquent les arbitrages plutôt que de paraphraser : `profile.ts:1-11` (la charnière vers une future base), `dev-node.ts:1-20` (pourquoi Node et non workerd), `wrangler.jsonc:26-28` (pourquoi `run_worker_first`), `valide.ts:1-10` (pourquoi un validateur maison).

❌ **Ni PRD, ni spécification, ni ADR, ni `CONTRIBUTING.md`, ni `LICENSE`, ni `CHANGELOG`, ni gabarit de PR ou d'issue.** `docs/` n'existait pas avant ce rapport. Pour un dépôt public, l'absence de `LICENSE` est à noter : sans licence, le code est « tous droits réservés » par défaut.

🔴 **Trois affirmations de la documentation sont contredites par les faits** — c'est le vrai problème documentaire, car un lecteur (humain ou agent) leur fait confiance :

| Affirmation                                                                                                    | Réalité                                                                                                                                                    | Preuve            |
| -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| `README.md:133` « Le déploiement est automatique : tout push sur `main` met le site à jour. »                  | **Jamais vrai.** 7 runs, 7 échecs, le déploiement n'a jamais été atteint.                                                                                  | `gh run list`     |
| `README.md:171` « Cmd+P produit un PDF propre »                                                                | L'iframe tronque ~95 % du contenu à l'impression.                                                                                                          | mesure live §3.3  |
| `README.md:101` « La CI passe ce test avant tout déploiement : un profil cassé ne peut pas arriver en ligne. » | La CI ne déploie pas ; le déploiement réel est `npm run deploy` en local, qui **ne lance pas les tests** (`package.json:27` = `build && wrangler deploy`). | `package.json:27` |

⚠️ _Ce dernier point est le plus sournois : la garde décrite dans le README est réellement absente du chemin de déploiement réellement emprunté._

---

## 4. Dette technique et risques

### 🔴 Critique — bloque ou menace la production

| #   | Risque                                                                                                                                         | Preuve                                                                                                      | Ce qui casse pendant une restructuration                                                                              |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| C1  | **`package-lock.json` ne contient que les binaires natifs `darwin-x64`** — le projet ne peut être construit que sur un Mac Intel.              | 13 paquets natifs, tous `darwin`, aucun `linux`/`win32` ; `@oxc-parser` : 20 variantes déclarées, 1 résolue | **Tout.** Aucune CI, aucun conteneur, aucun autre poste ne peut produire un build. Toute automatisation commence ici. |
| C2  | **CI : 7 échecs sur 7, aucune garde automatique avant la prod.** Pas de protection de branche (`404 Branch not protected`).                    | `gh run list`, `gh api …/protection`                                                                        | Une restructuration sans filet : aucun test, aucun build, aucune revue n'arrête une régression avant l'URL publique.  |
| C3  | **La production n'est reproductible que depuis ce Mac.** Le `dist/` local ignoré par Git est identique octet pour octet à ce qui est en ligne. | `diff live/local index.html` → identique ; mêmes empreintes `main-MYPEIG5F.js`                              | Perte du poste = perte de la capacité à redéployer **et** à revenir en arrière. Pas de rollback possible aujourd'hui. |
| C4  | **Le chemin de déploiement réel ne lance aucun test.** `npm run deploy` = `build && wrangler deploy`.                                          | `package.json:27`                                                                                           | Un profil cassé peut arriver en ligne malgré le validateur — exactement ce que le README jure impossible.             |

### 🟠 Important — dette structurante

| #   | Risque                                                                                                                                                   | Preuve                                                                 | Pendant une restructuration                                                                                                                                 |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I1  | **Le micro front-end par iframe casse l'impression (95 % tronqué), impose un double défilement et vide le HTML de tout contenu indexable.**              | mesures live §3.3                                                      | Changer ce choix touche routes, build, `compose-remotes.mjs` et `wrangler.jsonc` simultanément. À faire en une fois, pas par petits pas.                    |
| I2  | **Le TypeScript du Worker n'est typé-vérifié nulle part** ; `wrangler` l'efface avec esbuild sans le vérifier.                                           | aucun `tsconfig` ne couvre `apps/api/src` ni `modules/profile/api/src` | Toucher l'API sans ce filet, c'est découvrir les erreurs de type en production.                                                                             |
| I3  | **Aucun environnement de préproduction** : `main` pousse directement sur l'URL publique.                                                                 | `wrangler.jsonc` sans bloc `env.*`                                     | Impossible de valider une restructuration ailleurs qu'en prod.                                                                                              |
| I4  | **Aucun linter** ; `tsconfig.base.json` n'est étendu que par 1 paquet sur 6, et les 2 apps perdent `noUncheckedIndexedAccess`.                           | `ls`, `git grep '"lint"'`, tableau §3.7                                | La dérive de style et de strictness s'accélère dès qu'un second module arrive.                                                                              |
| I5  | **Le contenu est périmé d'environ 5 ans** (`misAJour: 2021-09`, dernière expérience 07/2021, 0 lien, 0 technologie).                                     | §3.5                                                                   | Sans objet techniquement, mais le projet rate sa cible tant que ce n'est pas corrigé — c'est l'écart le plus visible entre l'effort investi et le résultat. |
| I6  | **Aucun en-tête de sécurité**, en particulier `frame-ancestors` : le site est encadrable par n'importe qui.                                              | `HEAD /` en prod                                                       | Correction isolée, ~8 lignes de middleware Hono, sans risque de régression.                                                                                 |
| I7  | **Une seule suite de tests (7), entièrement sur le validateur.** Rien ne couvre l'API, le rendu, le routage, le repli SPA ni la composition des remotes. | `git ls-files` → 1 fichier de test                                     | **Le risque principal de la restructuration** : il n'existe aujourd'hui aucun moyen automatique de constater qu'on a cassé quelque chose. Cf. §5.           |

### 🟢 Mineur

M1 `bypassSecurityTrustResourceUrl` protégé par accident (`data` > `queryParams`) — à sécuriser avant de paramétrer les routes · M2 `tsconfig.json` dupliqué à l'identique entre les deux apps, `angular.json` à 95 % · M3 redirection 307 superflue sur `/remotes/profile/index.html` · M4 `technologies` et `liens` : code vivant sans donnée · M5 `computed` redondant (`profile-page.ts:40`) · M6 commentaires faux (« 503 », « un seul code ») et `ROUTE_INCONNUE` hors du type `ErreurApi` · M7 `rel="noopener"` sans `target="_blank"` · M8 `@angular/cdk`/`@angular/material` en dépendances de production du dépôt racine · M9 Node local v24.19.0 vs `.nvmrc` 22.23.2 · M10 pas de `LICENSE` sur un dépôt public · M11 `.angulardoc.json` / `.vscode/` à trancher (déjà noté `PROJECT_MEMORY.md:95`) · M12 reliquats de renommage (`/cv`, dossier `kinetiq` dans les logs CI).

---

## 5. Fonctionnalités à protéger par des tests e2e

Rien de ce qui suit n'est couvert aujourd'hui. **Ces tests doivent exister et passer _avant_ la première modification structurelle** — ils sont le filet qui rend la restructuration sûre. Classés par ordre de criticité.

| #      | Parcours à verrouiller                                                                            | Assertion                                                                           | Pourquoi c'est fragile                                                                                                                                     |
| ------ | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **E1** | **`GET /api/profile` → `200`** + corps conforme au contrat + `Cache-Control: public, max-age=300` | Le JSON valide le contrat ; 7 expériences, 4 formations, 4 groupes de compétences   | C'est la seule source de contenu du site.                                                                                                                  |
| **E2** | **`GET /api/inconnue` → `404` JSON `ROUTE_INCONNUE`**, pas du HTML                                | `content-type: application/json`                                                    | Dépend entièrement de `run_worker_first` (`wrangler.jsonc:28`). Une erreur de config et l'API renvoie la coquille Angular — panne silencieuse côté client. |
| **E3** | **Chargement direct de `/profile` → `200` HTML**, pas `404`                                       | Repli SPA actif                                                                     | Dépend de `not_found_handling` (`wrangler.jsonc:22`). Ce bug a déjà eu lieu : commit `56175df Fix profile remote route`.                                   |
| **E4** | **Le remote se charge dans la shell et affiche les 7 sections**                                   | Le document interne contient `<article class="profile">` et les 6 titres de section | Dépend de la chaîne `build → compose-remotes.mjs → base-href /remotes/profile/`. Trois maillons, aucun testé.                                              |
| **E5** | **Impression / PDF** : le document imprimé contient **l'intégralité** du profil                   | Nombre de pages > 1 ; la dernière section est présente dans le PDF                  | **Actuellement en échec** (§3.3). À écrire d'abord comme test rouge : il documente le bug et validera la correction.                                       |
| **E6** | **État d'erreur et réessai** : API en échec → message + bouton « Réessayer » fonctionnel          | `role="alert"` visible ; un clic relance la requête                                 | Seul comportement interactif du site (`profile-page.html:3-9`). Un changement de `httpResource` le casserait sans bruit.                                   |
| **E7** | **Redirections** : `/` → `/profile`, `/cv` → `/profile`, `/nimporte-quoi` → `/profile`            | URL finale = `/profile`, `200`                                                      | `/cv` est une compatibilité héritée : la première victime d'un nettoyage de routes.                                                                        |
| **E8** | **Thème sombre et responsive < 820 px**                                                           | Les variables `--ns-*` basculent ; passage en une colonne                           | 517 lignes de SCSS sans aucun test ; les points de rupture sont implicites.                                                                                |
| **E9** | **Le profil servi est bien celui du dépôt**                                                       | `GET /api/profile` ≡ `profile.fr.json`                                              | Garantit que la prod n'a pas dérivé du dépôt — ce qui, aujourd'hui, ne peut être vérifié qu'à la main.                                                     |

⚠️ **Prérequis à E1–E9 : corriger C1 d'abord.** Tant que `npm ci` échoue hors de ce Mac, aucun test e2e ne pourra tourner en CI — ils ne protégeraient que le poste qui, précisément, n'en a pas besoin.

---

## 6. Recommandations priorisées

_Effort : **S** < 1 h · **M** ≈ 1 demi-journée à 1 jour · **L** > 1 jour. Pas de plan d'implémentation ici, conformément à ta demande._

### Quick wins — à faire avant toute restructuration

| Prio | Action                                                                                                                                               | Effort | Pourquoi maintenant                                                                                                                          |
| :--: | ---------------------------------------------------------------------------------------------------------------------------------------------------- | :----: | -------------------------------------------------------------------------------------------------------------------------------------------- |
|  1   | **Régénérer `package-lock.json` avec toutes les plateformes** (lockfile multi-OS/arch) et vérifier que la CI verdit.                                 | **S**  | **Débloque tout le reste.** Sans cela, aucune automatisation n'est possible. C'est une correction d'une ligne de commande pour un risque 🔴. |
|  2   | **Sauvegarder l'état déployé actuel** (archiver le `dist/` local, ou noter l'identifiant de version Cloudflare) avant de toucher à quoi que ce soit. | **S**  | Assurance rollback tant que C3 n'est pas résolu.                                                                                             |
|  3   | **Ajouter les en-têtes de sécurité** dans le Worker (`frame-ancestors`, `nosniff`, `Referrer-Policy`, CSP).                                          | **S**  | ~8 lignes de middleware Hono, zéro risque de régression, règle I6.                                                                           |
|  4   | **Mettre `npm test` dans `npm run deploy`** et corriger les 3 affirmations fausses du README (§3.10).                                                | **S**  | Règle C4 et réaligne la documentation sur la réalité — indispensable si des agents doivent s'y fier.                                         |
|  5   | **Activer la protection de `main`** (CI obligatoire, pas de push direct) une fois la CI verte.                                                       | **S**  | Règle la moitié de C2. À faire **après** le point 1.                                                                                         |
|  6   | **Ajouter un `tsconfig.json` à `apps/api`** couvrant `apps/api/src` et `modules/profile/api/src`, et une étape `tsc --noEmit` en CI.                 | **S**  | Règle I2 : le Worker cesse d'être une zone aveugle.                                                                                          |
|  7   | **Rafraîchir `profile.fr.json`** : `misAJour`, expériences depuis 2021, `liens`, `technologies`.                                                     | **S**  | Règle I5. Sans risque technique, fort effet visible.                                                                                         |
|  8   | **Épingler Node** (`nvm use` systématique, ou `engines` strict + `.node-version`).                                                                   | **S**  | Règle M9 avant qu'il ne produise un build douteux.                                                                                           |

### Chantiers structurants

| Prio | Chantier                                                                                                                                                                         |  Effort   | Enjeu                                                                                                                                                                                                                                                                             |
| :--: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|  9   | **Écrire la couverture e2e §5 (E1–E9)** et la brancher en CI.                                                                                                                    |   **M**   | Le filet qui rend tout le reste sûr. À poser **avant** le chantier 11.                                                                                                                                                                                                            |
|  10  | **Ajouter un linter** (ESLint + `angular-eslint`, ou Biome) avec script `lint` en CI, et faire des apps Angular de vraies héritières de `tsconfig.base.json`.                    |   **M**   | Règle I4 et M2. Condition d'une automatisation du développement (un agent a besoin d'un juge déterministe).                                                                                                                                                                       |
|  11  | **Trancher le sort de l'iframe** : la remplacer par une composition en temps de build (la shell importe directement `@ns-studio/profile-ui`) ou par du Module Federation assumé. | **M → L** | Règle I1 d'un coup : impression, défilement, SEO. **Pour 2 465 lignes et un seul module, la composition directe est l'option que je recommande** — elle supprime `compose-remotes.mjs`, une application Angular entière et un `proxy.conf.json`. ❓ à trancher avec toi (cf. Q1). |
|  12  | **Créer un environnement de préproduction** (`env.preview` dans `wrangler.jsonc` + déploiement de preview sur les PR).                                                           |   **M**   | Règle I3. Rend chaque PR observable avant fusion — levier majeur pour automatiser le développement.                                                                                                                                                                               |
|  13  | **Sortir le contenu du bundle** vers un stockage modifiable (D1 ou KV) derrière `lireProfile()`.                                                                                 |   **L**   | **Le vrai préalable à un « éditeur de CV ».** L'architecture l'anticipe déjà correctement (`profile.ts:1-11`) : le point d'extension existe, il n'est pas utilisé.                                                                                                                |
|  14  | **Si l'objectif est bien un éditeur** : authentification, routes d'écriture avec validation d'entrée, multi-CV, système de templates.                                            |   **L**   | Aujourd'hui **rien de tout cela n'existe** (§3.1, §3.4). C'est une construction, pas une restructuration — à cadrer séparément (cf. Q2).                                                                                                                                          |

---

## 7. Questions ouvertes

Ce que je n'ai pas pu déterminer seul, par ordre d'impact sur la décision de restructuration.

**Q1 — L'architecture micro front-end est-elle un objectif ou un moyen ?** Le README la présente comme la raison d'être de la structure (`:115-127`), mais pour 2 465 lignes et un seul module elle coûte l'impression PDF, le SEO et le défilement (§3.3), et le second module qui la justifierait n'a jamais été écrit. **Veux-tu la garder (et alors corriger l'iframe), ou la simplifier en composition directe ?** Ma recommandation va à la simplification, mais c'est une décision de produit, pas de code.

**Q2 — « Éditeur de CV » : cible ou description ?** Ta mission parle d'un éditeur ; le dépôt est un **afficheur en lecture seule**, sans écriture, sans authentification, sans multi-CV, sans templates. **Si l'éditeur est la cible, l'essentiel du travail est une construction neuve** (chantiers 13 et 14), pas une restructuration — et cela change entièrement la priorisation. S'il s'agit d'un portfolio personnel qui doit le rester, les chantiers 13/14 tombent.

**Q3 — Pourquoi le lockfile est-il élagué à `darwin-x64` ?** Je n'ai pas trouvé la cause : pas de `.npmrc` local, `npm config get os/cpu/omit` ne force rien, et `~/.npmrc` existe mais je ne l'ai pas lu (hors périmètre du dépôt). **Sans la cause, la correction risque d'être défaite au prochain `npm install`.** M'autorises-tu à lire `~/.npmrc` ?

**Q4 — Le déploiement doit-il rester sur `ns.latech.workers.dev` ?** `PROJECT_MEMORY.md:10-12,96` laisse la question du domaine ouverte. Un nom définitif change la configuration du Worker, les méta `og:`, et le moment où il faut le faire (avant ou après la restructuration).

**Q5 — Quel niveau d'automatisation vises-tu ?** « Automatiser son développement » peut vouloir dire CI verte + preview par PR (chantiers 9, 10, 12), ou un dépôt pilotable par des agents (et alors il faut un linter, des e2e et une préproduction **avant** tout, plus un `CONTRIBUTING.md` normatif). Les deux lectures priorisent différemment.

**Q6 — Le `permis` doit-il rester affiché ?** Il est en tension avec la doctrine de non-publication des données personnelles exposée dans `contract.ts:18-25` et `README.md:103-111`.

**Q7 — Autorisation pour la suite.** Pour vérifier formellement les constats marqués ⚠️, j'aurais besoin de lancer `npm ci`, `npm run build` et `npm test` en local (jamais de déploiement). **Tu m'as demandé de solliciter ton accord avant : je le demande ici.** Cela permettrait notamment de capturer le PDF réel de E5 et de confirmer la correction du lockfile.

**Q8 — Licence.** Dépôt public sans `LICENSE` : « tous droits réservés » par défaut. Est-ce voulu ?

---

_Rapport produit en lecture seule le 2026-11-02 sur le commit `2e97a59`. Aucun fichier existant modifié, renommé ou supprimé ; aucun build, test, déploiement, migration ni écriture distante. Seul fichier créé : `docs/audit/rapport-audit.md`. Les vérifications réseau se sont limitées à des requêtes `GET`/`HEAD` sur l'URL publique et à des lectures de l'API GitHub._
