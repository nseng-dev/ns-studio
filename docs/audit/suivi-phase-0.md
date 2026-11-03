# Suivi — Phase 0 : remettre la chaîne de livraison en état

**Objectif** : CI verte, production protégée, **zéro changement de comportement visible** et **zéro montée de version de dépendance**.
**Commit de départ** : `2e97a59` (`main` = `origin/main` = `claude/dev`).
**Plan de référence** : `~/.claude/plans/objectif-global-buzzing-treehouse.md` (v2).

---

## Tableau de bord

|  Lot  | Intitulé                                  | Statut           | Branche                  | PR                                                  | Notes                                                                                                                        |
| :---: | ----------------------------------------- | ---------------- | ------------------------ | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **0** | Assurer le retour arrière                 | ✅ **done**      | _(aucune — sans commit)_ | —                                                   | Archive vérifiée contre la prod (8/8). **Relevé Cloudflare non fait** : déplacé en fin de phase, étape 0 du déploiement.     |
| **1** | Lockfile multi-plateforme + npm unique    | ✅ **done**      | `fix/lockfile`           | [#1](https://github.com/nseng-dev/ns-studio/pull/1) | Fusionnée le 2026-11-02 (`833fe47`). 182 ajouts / 0 modif / 0 suppr. Build identique octet pour octet.                       |
| **2** | Typage du Worker                          | ✅ **done**      | `fix/typecheck`          | [#2](https://github.com/nseng-dev/ns-studio/pull/2) | Fusionnée en **squash** le 2026-11-02 (`90bc08b`). CI verte (11/11). Aucune erreur de type applicative.                      |
| **3** | Garde de déploiement, doc fidèle, licence | ✅ **done**      | `fix/doc-licence`        | [#3](https://github.com/nseng-dev/ns-studio/pull/3) | Fusionnée en **squash** le 2026-11-03 (`6e8f93e`). CI verte (11/11, 46 s). Aucune ligne de code applicatif.                  |
| **4** | En-têtes de sécurité                      | 🟡 **in-review** | `fix/headers`            | [#4](https://github.com/nseng-dev/ns-studio/pull/4) | **CI verte** (11/11, 51 s). Build identique à l'archive du lot 0 — **8/8 fichiers**, `_headers` en seul ajout. 7 → 15 tests. |

Statuts : ⬜ todo · 🔵 in-progress · 🟡 in-review · ✅ done

---

## Lot 0 — Détail

### ✅ Archive du `dist/` local

|               |                                                                                        |
| ------------- | -------------------------------------------------------------------------------------- |
| Archive       | `~/backups/ns-studio-dist-2026-11-02.tar.gz` (182 Ko, 8 fichiers, 672 Ko décompressés) |
| sha256        | `60462adab26252d4e31851334d07ba7526a829af3073dd474559a60a37059db6`                     |
| Photo d'avant | `~/backups/ns-studio-avant-lot1-2026-11-02/`                                           |

> ### ⚠️ Portée exacte de cette archive
>
> **L'archive ne couvre que les fichiers statiques** (`dist/web/browser` : HTML, JS, CSS du shell et du remote).
> Elle **ne contient pas le Worker** — ni son code compilé, ni sa configuration, ni ses bindings.
>
> **Le retour arrière complet passe par `wrangler rollback <id>`**, qui restaure le Worker _et_ les fichiers
> de la version visée. **L'archive n'est que le second filet** : elle sert à reconstituer les assets
> si une version Cloudflare n'est plus disponible, ou à comparer un build futur à l'état de référence.
>
> Les deux moitiés sont nécessaires : identifiant de version Cloudflare **et** archive des fichiers.
> C'est pourquoi le relevé ci-dessous reste ouvert.

### ✅ L'archive est bien une copie fidèle de la production

Vérifié par empreinte sha256, fichier par fichier, contre `https://ns.latech.workers.dev` le 2026-11-02 :

```
index.html                                IDENTIQUE
main-MYPEIG5F.js                          IDENTIQUE
chunk-BO7PRPI4.js                         IDENTIQUE
chunk-56T6K4PF.js                         IDENTIQUE
styles-T33H5HNF.css                       IDENTIQUE
remotes/profile/index.html                IDENTIQUE
remotes/profile/main-63NITB7G.js          IDENTIQUE
remotes/profile/styles-T33H5HNF.css       IDENTIQUE
GET /api/profile                          IDENTIQUE à modules/profile/contract/src/data/profile.fr.json
```

> **Piège rencontré** : interroger `/index.html` directement renvoie une redirection 307 vers `/`, donc un corps vide,
> dont l'empreinte `e3b0c442…` est celle de la chaîne vide — un faux « DIFFERENT ». Il faut `curl -L`.
> Consigné dans le journal des leçons.

### ✅ Photo d'avant pour le lot 1

Contenu de `~/backups/ns-studio-avant-lot1-2026-11-02/` :

| Fichier                                  | Rôle                                                                                |
| ---------------------------------------- | ----------------------------------------------------------------------------------- |
| `package-lock.json`                      | **référence du mode `--compare`** : le lock d'après ne doit contenir que des ajouts |
| `package.json`                           | état avant modification de `engines`                                                |
| `versions-resolues.json`                 | 400 entrées `{version, resolved, integrity}` extraites du lock                      |
| `npm-ls-depth0.json`                     | arbre installé au moment de la photo                                                |
| `dist-fichiers.sha256`, `archive.sha256` | empreintes                                                                          |
| `live-vs-archive.txt`                    | preuve de conformité à la prod                                                      |
| `api-profile-live.json`                  | corps servi par l'API                                                               |
| `commit.txt`, `git-status.txt`           | `2e97a59`, arbre propre hormis `docs/audit/rapport-audit.md` non suivi              |

### ⏭️ Relevé de la version en production — déplacé en fin de phase

> **Décision du 2026-11-03 : on arrête de réessayer.** Trois tentatives, trois fois le même échec,
> pour la même cause — une session wrangler que seul toi peux renouveler. Une quatrième tentative
> n'apporterait aucune information nouvelle ; la relancer à chaque lot ne fait que remplir le suivi
> d'un échec déjà documenté.
>
> Ce relevé devient **l'étape 0 de ton déploiement manuel** : voir « Ce qui reste de ton côté »,
> en fin de ce document. C'est le seul moment où l'identifiant de retour arrière devient
> indispensable — et le seul moment où le relever a un sens, puisqu'il doit désigner la version
> **encore en place** juste avant qu'elle ne soit remplacée.
>
> Le diagnostic ci-dessous est conservé : il explique pourquoi la commande échoue, et quoi lancer.

`npx wrangler deployments list` échoue :

```
✘ [ERROR] In a non-interactive environment, it's necessary to set a
  CLOUDFLARE_API_TOKEN environment variable for wrangler to work.
```

**Cause** : le jeton d'accès OAuth stocké dans `~/Library/Preferences/.wrangler/config/default.toml`
a expiré le **2026-09-28** (il y a 35 jours). Un `refresh_token` et le scope `offline_access` sont bien présents,
mais wrangler détecte un shell non interactif et refuse de rafraîchir tout seul.

**Ce que je ne fais pas** : m'authentifier à ta place.

**Seconde tentative — 2026-11-02 20:46 UTC** : échec identique. Le fichier de configuration porte toujours
`expiration_time = "2026-09-28T20:25:32.643Z"`, **inchangé** : la session n'a pas été renouvelée.

**Troisième tentative — 2026-11-02 22:59 UTC** : échec identique, même message. `default.toml` est toujours
daté du **28 septembre 21:25** et porte la même `expiration_time` — la session n'a **pas** été renouvelée.
Le bloc de sortie attendu dans la consigne du lot 2 est arrivé vide (le texte de remplacement n'avait pas
été substitué), et l'onglet Terminal ne contenait aucune commande lancée. Les trois champs restent donc
ouverts : **rien n'a été relevé, rien n'a été inventé.**

| Champ                            | Valeur             |
| -------------------------------- | ------------------ |
| Identifiant de la version active | ❓ **non relevé**  |
| Date de la version               | ❓ **non relevée** |
| Auteur                           | ❓ **non relevé**  |

> Ces trois champs restent vides **délibérément**. Les inventer donnerait un faux filet de sécurité :
> un `wrangler rollback` sur un identifiant erroné échouerait au pire moment.

**À lancer par toi**, en fin de phase, juste avant de déployer (étape 0 du déploiement) :

```bash
cd /Users/nara/Desktop/Nara/Dev/Nara-diy-dev/GitHub/ns-studio && npx wrangler login && npx wrangler deployments list && npx wrangler versions list
```

Me coller la sortie **réelle** : je remplirai le tableau ci-dessus.

> **Impact sur la Phase 0 : nul jusqu'au déploiement.** Aucun déploiement n'a lieu pendant la
> Phase 0, donc aucun retour arrière n'est nécessaire d'ici là — et un identifiant relevé
> aujourd'hui serait de toute façon périmé le jour du déploiement. Mais au moment du déploiement,
> la sauvegarde est **incomplète** sans lui (cf. portée de l'archive ci-dessus) : il se relève
> **avant** l'envoi, pas après.

---

## Protection de `main` — active depuis le 2026-11-02

Réglée sur GitHub par le propriétaire du dépôt. Règles en vigueur :

| Règle                                                    | Effet                                                                                                            |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Pull request obligatoire, **0 approbation** requise      | Travail en solo : la relecture est celle de la CI, pas d'un second humain.                                       |
| Check **« Build et tests » obligatoire**                 | Le job `ci` de `.github/workflows/ci.yml`. Rouge ⇒ fusion impossible.                                            |
| Branche **à jour avec `main`** avant la fusion           | Pas de fusion sur une base périmée : la CI qui valide est celle du code qui atterrit.                            |
| **Conversations résolues** obligatoires                  | Aucune remarque de relecture ne se perd dans une PR fusionnée.                                                   |
| **Historique linéaire**, fusion en **squash uniquement** | Un lot = un commit sur `main`. **Le titre de la PR devient ce commit** : il doit respecter Conventional Commits. |
| **Aucun contournement, même administrateur**             | Plus aucun push direct sur `main` — y compris par le propriétaire.                                               |
| Suppression automatique de la branche après fusion       | Pas de branches mortes à trier.                                                                                  |

> **Conséquence pour la boucle de travail** : le titre de la PR n'est plus cosmétique, c'est le message de
> commit de `main`. Il est rédigé en Conventional Commits dès l'ouverture, pas corrigé au moment de fusionner.

> **Note sur le lot 1** : la PR #1 a été fusionnée en **commit de fusion** (`833fe47`), avant l'activation de
> la règle d'historique linéaire. Les lots suivants produiront un commit de squash unique.

---

## Reporté au lot 3 — périmètre élargi · ✅ appliqué

Relevé en relisant le fichier CI installé par le lot 1. Rien n'en était appliqué dans le lot 2 : ces points
partent dans la PR `fix/doc-licence`. **Tous sont en place — voir « Lot 3 — Détail ».**

### `.github/workflows/ci.yml`

| Changement                                                                                       | Pourquoi                                                                                                                                                                                                           |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Job `deploy` : `if: github.event_name == 'workflow_dispatch' && github.ref == 'refs/heads/main'` | Aujourd'hui le déclenchement manuel accepte **n'importe quelle branche** : une branche de travail peut partir en production depuis l'onglet Actions. La garde « un push ne déploie plus » existe, celle-ci manque. |
| `concurrency.cancel-in-progress: ${{ github.event_name == 'pull_request' }}`                     | Aujourd'hui un push sur `main` **annule un déploiement en cours** : l'économie utile sur une PR devient une interruption au milieu d'un envoi vers la production.                                                  |

### `CLAUDE.md`, partie « Standard commun »

À inscrire, en plus de ce que prévoit le plan :

- les sept règles de protection de `main` ci-dessus ;
- **titre de PR = commit de squash = Conventional Commits** ;
- les deux règles de CI ci-dessus : **un déploiement manuel ne part que de `main`**, et **un push n'annule
  jamais un déploiement en cours** ;
- _(demandé le 2026-11-03)_ en **§1, tout en haut de la partie 1** : « Au début de chaque session, lis
  d'abord `docs/audit/suivi-phase-<n>.md` et `docs/automation/lecons.md` : c'est là qu'est l'état du
  travail, pas dans la mémoire de la session. » Une session a repris le lot 2 sans contexte et sans
  perte, précisément parce que ces deux fichiers portaient l'état — la règle entérine ce qui a marché.

---

## Lot 1 — Détail

### Le résultat

| Critère                                                    | Verdict                                                |
| ---------------------------------------------------------- | ------------------------------------------------------ |
| Lock complet                                               | ✅ 193 optionnelles déclarées, **0 absente**           |
| Entrées de plateforme                                      | ✅ linux **85** · darwin **26** · win32 **26**         |
| Réparation additive                                        | ✅ **182 ajouts, 0 modification, 0 suppression**       |
| Versions des dépendances existantes                        | ✅ **aucune n'a bougé**                                |
| Build inchangé                                             | ✅ **identique octet pour octet** à l'archive du lot 0 |
| `npm ci` · `test` · `build` · `--dry-run` · `format:check` | ✅ tout vert sous Node 22.23.2 / npm 12.2.0            |

Les compteurs 85/26/26 sont exactement ceux du dernier lock sain (`22edb63`) — confirmation
indépendante que la réparation retombe sur l'état correct.

### Comment on y est arrivé — npm ne sait pas réparer son propre lock

La méthode prévue au plan (`rm -rf node_modules` puis `npm install`) **n'a pas suffi**. Quatre
stratégies ont été mesurées avant d'en trouver une qui satisfasse les deux critères :

| Stratégie                                             | Complet ?        | Additif ?                    | Verdict     |
| ----------------------------------------------------- | ---------------- | ---------------------------- | ----------- |
| **A** `rm -rf node_modules` + `npm install`           | ❌ 95 absentes   | ✅ 0 modif, 1 suppr          | rejetée     |
| **B** retirer les parents incomplets du lock          | ❌ 3 absentes    | ❌ 8 modifs, 28 suppr        | rejetée     |
| **F** `npm install --os/--cpu` forcés (5 plateformes) | ❌ 95 absentes   | ✅                           | rejetée     |
| **D** repli du plan : repartir de `22edb63`           | ✅ 0 absente     | ❌ **65 montées de version** | rejetée     |
| **H** injection additive **puis** fermeture par npm   | ✅ **0 absente** | ✅ **0 modif, 0 suppr**      | **retenue** |

**Pourquoi A, B et F échouent** : npm ne revisite jamais un parent déjà résolu dans le lock. Les
huit paquets amputés (`oxc-parser`, `rolldown`, `lightningcss`, `@parcel/watcher`, `lmdb`,
`msgpackr-extract`, `@napi-rs/nice`) gardent leur entrée élaguée et sont considérés satisfaits —
y compris en forçant `--os`/`--cpu`. Les binaires Linux dont le build Angular a besoin
(`@oxc-parser/binding-linux-x64-gnu`, `@rolldown/binding-linux-x64-gnu`, `lightningcss-linux-x64-gnu`)
restaient absents : **la CI aurait échoué à l'identique.**

**Pourquoi D est inacceptable** : le repli prévu au plan produit bien un lock complet, mais npm
re-résout les plages `^` et fait monter **65 versions** (Angular 22.1.6 → 22.2.4/22.2.5…). C'est
précisément ce que la Phase 0 interdit. Le critère strict demandé a donc fait son travail : il a
éliminé la solution de repli que le plan jugeait acceptable.

**La stratégie retenue (H)**, en deux temps :

1. `scripts/repare-lockfile.mjs` injecte les 172 entrées manquantes. Aucune résolution n'est en
   jeu : les parents déclarent leurs bindings en **version exacte** (`"@oxc-parser/binding-linux-x64-gnu": "0.142.0"`),
   il n'y a donc qu'à récupérer URL, empreinte et contraintes `os`/`cpu` publiées par le registre.
   C'est ce que fait le correctif npm lui-même.
2. `npm install --package-lock-only` complète ensuite la **fermeture transitive** — les entrées
   injectées tirent des dépendances (`@emnapi/*`, `@napi-rs/wasm-runtime`…) dont l'imbrication
   relève de la logique de déduplication de npm, qu'il ne faut surtout pas écrire à la main.

Une seule entrée a dû être réinjectée : `@angular/animations`, peer **optionnelle** de
`@angular/platform-browser`, dépréciée et importée nulle part — npm 12 ne la retient plus. Elle est
conservée pour que l'arbre installé reste celui d'avant.

### Points de vigilance relevés

- **npm 12 bloque 6 scripts d'installation** par défaut (`@parcel/watcher`, `esbuild` ×2, `lmdb`,
  `msgpackr-extract`, `workerd`) — changement de comportement par rapport à npm 10.9.8. Sans effet
  ici : test et build passent, et le binaire produit est identique. À surveiller si un paquet natif
  est ajouté plus tard.
- **`wrangler deploy --dry-run` fonctionne sans authentification** — vérifié dans le code
  (`cli.js:313471`) puis **confirmé en exécution**. La CI peut donc valider la configuration du
  Worker sans le moindre secret.

---

## Lot 2 — Détail

### Le problème

`apps/api/src` (le Worker) et `modules/profile/api/src` (les routes du module profil) n'étaient couverts par
**aucun** `tsconfig`. Wrangler les assemble avec esbuild, qui efface les types sans les vérifier : le seul
code serveur de la plateforme ne passait donc sous aucun contrôle de types, ni en local ni en CI.

### Le résultat

| Critère                                                                                      | Verdict                                                                                                                                         |
| -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/src` + `modules/profile/api/src` couverts par `tsc`                                | ✅ 8 fichiers dans le programme, erreurs prouvées détectées                                                                                     |
| Erreurs de types dans le code applicatif                                                     | ✅ **aucune** — rien à corriger, donc rien de modifié                                                                                           |
| `apps/profile` (le point de vigilance du plan)                                               | ✅ **3 erreurs, toutes TS6059** — configuration, pas types                                                                                      |
| `npm ci` · `verify:lockfile` · `test` · `typecheck` · `build` · `--dry-run` · `format:check` | ✅ tout vert sous Node 22.23.2 / npm 12.2.0                                                                                                     |
| Lockfile                                                                                     | ✅ 193 optionnelles déclarées / **0 absente** ; `--compare` : 182 ajouts, **0 modif, 0 suppr**                                                  |
| Build inchangé                                                                               | ✅ **identique octet pour octet** à l'archive du lot 0 (8/8)                                                                                    |
| Réponses de l'API inchangées                                                                 | ✅ `/api/profile` identique au corps relevé en production ; `/api/inconnu` → `{"code":"ROUTE_INCONNUE","message":"Aucune route /api/inconnu."}` |

### Le point de vigilance du plan — levé

Le plan prévoyait un arrêt si `tsc -p apps/profile/tsconfig.app.json --noEmit` révélait beaucoup d'erreurs.
Il en révèle **trois**, toutes de code **TS6059** (« File … is not under rootDir »), et aucune n'est une
erreur de types : `tsconfig.app.json` déclare un `outDir`, l'application importe `@ns-studio/profile-ui`
depuis `modules/`, et `tsc` en déduit un `rootDir` trop étroit. L'objection ne porte que sur la disposition
des fichiers **émis** — or la vérification n'émet rien.

Corrigé **sans toucher à la configuration de construction** : un `apps/profile/tsconfig.typecheck.json`
dédié élargit `rootDir` à la racine du dépôt. `tsconfig.app.json`, que lit `ng build`, reste intact.
Résultat : l'application **et** le module d'interface qu'elle consomme sont vérifiés, exit 0.

**Aucune ligne de code applicatif n'a été modifiée pour faire passer la vérification.**

### Ce que couvre la vérification, et ce qu'elle ne couvre pas

`npm run typecheck` enchaîne quatre projets :

| Projet                                    | Fichier                                                         | Portée                                                                |
| ----------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------- |
| contrat                                   | `modules/profile/contract/tsconfig.json` (via `build:contract`) | types, validation, données du profil                                  |
| **Worker + routes du module** _(nouveau)_ | `apps/api/tsconfig.json`                                        | `apps/api/src/**` + `modules/profile/api/src/**` + sources du contrat |
| shell Angular                             | `apps/web/tsconfig.app.json`                                    | `apps/web/src/**`                                                     |
| remote Angular + module d'interface       | `apps/profile/tsconfig.typecheck.json`                          | `apps/profile/src/**` + `modules/profile/ui/src/**`                   |

**Non couvert** : les gabarits Angular (`strictTemplates`) — c'est `ng build`, donc l'étape `build`, qui les
contrôle ; et les globales du runtime Cloudflare (voir ci-dessous).

### 🔴 `worker-configuration.d.ts` — non produit, et pourquoi ce n'est pas bloquant

Le plan prévoyait `npx wrangler types apps/api/worker-configuration.d.ts`. La commande **échoue sur ce
poste** : elle produit bien la partie « configuration » (l'interface `Env` avec son binding `ASSETS`), puis
lance **workerd** pour en déduire les types du runtime — et workerd exige macOS 13.5+ (ce Mac : 12.6). Aucun
fichier n'est écrit.

```
Generating project types...   ✅
Generating runtime types...   ✘ Unsupported macOS version: … minimum requirement is macOS 13.5.0+
```

**Pourquoi ce n'est pas bloquant** : le Worker **ne lit aucun binding**. `ASSETS` est servi par
`wrangler.jsonc` (`assets.binding`), jamais par le code ; `apps/api/src/index.ts` monte des routes Hono et
rien d'autre. Un `Env` déclaré ne serait utilisé par aucune ligne. Générer un fichier à moitié — l'interface
`Env` sans les types du runtime qu'elle référence (`Fetcher`) — aurait au contraire **cassé** la vérification.

À la place, `apps/api/tsconfig.json` retire `DOM` de `lib` : un Worker n'a ni `document` ni `window`, et
hériter de la configuration Angular laissait passer du code impossible en production (vérifié :
`document.title` est désormais refusé).

**Le jour où le Worker lira `env`**, deux voies — à trancher alors : générer le fichier sur Linux ou en CI,
ou adopter `@cloudflare/workers-types`. Consigné au journal des leçons.

### Fichiers touchés

| Fichier                                    | Changement                                                                                                |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `apps/api/tsconfig.json`                   | **nouveau** — couvre le Worker et les routes du module ; `lib: ["ES2022"]` ; contrat visé par ses sources |
| `apps/profile/tsconfig.typecheck.json`     | **nouveau** — vérification seule, `rootDir` élargi ; `tsconfig.app.json` intact                           |
| `package.json`                             | script `typecheck` (4 projets)                                                                            |
| `apps/api/package.json`                    | dépendance `@ns-studio/profile-contract` déclarée — le Worker importe désormais son type d'erreur         |
| `package-lock.json`                        | **+1 ligne**, édition chirurgicale de l'entrée `apps/api` (voir la friction ci-dessous)                   |
| `.github/workflows/ci.yml`                 | étape « Les types tiennent » entre test et build                                                          |
| `modules/profile/contract/src/contract.ts` | **M6** — `code: 'PROFILE_INVALIDE' \| 'ROUTE_INCONNUE'` ; commentaire « un seul code » corrigé            |
| `modules/profile/contract/src/valide.ts`   | **M6** — commentaire : « 503 côté API » → **500**, ce que le code renvoie réellement                      |
| `apps/api/src/index.ts`                    | réponse `notFound` annotée `ErreurApi`                                                                    |

### Pourquoi le contrat est visé par ses **sources** dans `apps/api/tsconfig.json`

`@ns-studio/profile-contract` s'importe normalement par son `dist/`. Deux raisons de le viser par ses sources :

1. En CI, `typecheck` **précède** `build` : sur un dépôt fraîchement cloné, `dist/` n'existe pas encore.
2. Des déclarations périmées masquent exactement l'erreur qu'on cherche — constaté en cours de route :
   `ErreurApi` élargi dans la source mais encore étroit dans `dist/` faisait échouer la vérification du
   Worker pour une mauvaise raison.

Les deux applications Angular, elles, consomment le contrat par son `dist/` (c'est ainsi que `ng build` le
voit) : `typecheck` construit donc le contrat en premier. Cette dépendance est explicite dans le script.

### La CI confirme

PR [#2](https://github.com/nseng-dev/ns-studio/pull/2), exécution
[41543875221](https://github.com/nseng-dev/ns-studio/actions/runs/41543875221) : **11 étapes sur 11 au vert
en 54 s**, dont « Les types tiennent », et job de déploiement **non déclenché** (`skipping`).

Cette exécution vérifie en passant la conception retenue : la CI part d'un dépôt fraîchement cloné, sans
`dist/`, et `typecheck` y précède `build` — la vérification ne dépend donc d'aucun artefact préexistant.

### 🟥 Friction — `npm install --package-lock-only` défait la réparation du lot 1

Ajouter la dépendance d'espace de travail par la commande normale a produit **3 ajouts et 19 suppressions**
dans le lock pour une ligne voulue : npm 12 a **supprimé** l'entrée `@angular/animations` — la peer optionnelle
réinjectée à la main au lot 1 — et resynchronisé `engines` au passage.

Revenu en arrière, puis **édition chirurgicale** : une ligne ajoutée à l'entrée `apps/api` du lock. Les deux
modes de la garde repassent ensuite au vert, dont `--compare` contre la photo du lot 0 : **0 modification,
0 suppression**. Consigné au journal des leçons.

---

## Lot 3 — Détail

### Le problème

Trois objets distincts, tous sur le même thème : **ce que le dépôt dit de lui-même n'était pas vrai.**

1. **La garde de déploiement était incomplète.** Le lot 1 avait coupé le lien « push ⇒ déploiement »,
   mais `workflow_dispatch` seul laisse le sélecteur de branche de l'onglet Actions envoyer
   **n'importe quelle** référence en production ; et le même bloc `concurrency` servait les PR et les
   déploiements, donc un push sur `main` pouvait **annuler un envoi en cours**.
2. **Le README affirmait trois choses fausses**, dont une sur la production elle-même.
3. **Aucune licence**, alors que le dépôt est public — donc, juridiquement, « tous droits réservés ».

### Le résultat

| Critère                                                                                      | Verdict                                                                                                    |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `npm ci` · `verify:lockfile` · `test` · `typecheck` · `build` · `--dry-run` · `format:check` | ✅ tout vert sous Node 22.23.2 / npm 12.2.0                                                                |
| Lockfile                                                                                     | ✅ 193 optionnelles déclarées / **0 absente**                                                              |
| Build inchangé                                                                               | ✅ **identique octet pour octet** à l'archive du lot 0 (8/8)                                               |
| Réponses de l'API inchangées                                                                 | ✅ `/api/profile` identique au corps relevé en production ; `/api/inconnu` → `{"code":"ROUTE_INCONNUE",…}` |
| Code applicatif modifié                                                                      | ✅ **aucune ligne** — le seul changement dans `src/` est un commentaire                                    |

Le lot ne touche que de la documentation, de la configuration et un fichier de licence. La preuve que
rien n'a bougé est l'empreinte du build, pas la relecture du diff.

### Les deux gardes de CI

```yaml
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}
```

```yaml
if: github.event_name == 'workflow_dispatch' && github.ref == 'refs/heads/main'
```

Les deux sont **invérifiables localement** : seul GitHub évalue ces expressions. Ce que la CI de cette
PR prouve, c'est que le fichier reste valide et que le job `ci` passe ; que le job `deploy` soit sauté
sur une branche autre que `main` ne sera constaté qu'au premier déclenchement manuel. La syntaxe YAML
est néanmoins validée par Prettier, qui parse le fichier.

### `npm run deploy` devient une garde, pas un raccourci

```
verify:lockfile → test → typecheck → build → wrangler deploy
```

Avant : `build → wrangler deploy`. Le README prétendait que « la CI passe ce test avant tout
déploiement » — c'était faux par les deux chemins : la CI ne déployait pas, et la commande locale ne
testait pas. L'affirmation est maintenant vraie des deux côtés : `needs: ci` pour le job, et la chaîne
ci-dessus pour le poste.

### Les trois affirmations fausses du README

| Où   | Ce qui était écrit                                                            | Ce qui est vrai                                                                                                                                               |
| ---- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `§5` | « Le déploiement est automatique : tout push sur `main` met le site à jour. » | **Un push ne déploie rien.** Déclenchement manuel depuis `main` seule, ou `npm run deploy` en local. Et le secret `CLOUDFLARE_API_TOKEN` n'existe pas encore. |
| `§3` | « La CI passe ce test avant tout déploiement »                                | Vrai **depuis ce lot**, par deux chemins (`needs: ci` et la chaîne de `npm run deploy`).                                                                      |
| `§7` | « **Cmd+P produit un PDF propre** »                                           | **Tronqué depuis la shell** : l'iframe est plafonnée à `100dvh` et aucune règle `@media print` ne la libère. Contournement : imprimer `/remotes/profile/`.    |

> **Comment la troisième a été établie** : par lecture du code, pas par observation. `apps/web/src/app/remote-frame/remote-frame.scss`
> fixe `min-block-size: 100dvh` sur `.remote` et sur l'hôte ; un `grep` sur `@media print` dans
> `apps/web/src`, `apps/profile/src`, `modules/profile/ui/src` et `packages/ui/src` ne renvoie que trois
> blocs — `tokens.scss` (couleurs), `base.scss` (corps, `@page`, URL des liens) et `profile-page.scss` —
> **aucun ne cible l'iframe**. Un navigateur imprime une iframe dans la boîte qu'elle occupe : le profil
> est donc coupé à la hauteur d'un écran.
>
> **Ce que je n'ai pas fait** : constater le PDF. L'impression n'est pas observable depuis ce poste
> (pas de `wrangler dev`, et l'aperçu d'impression n'est pas pilotable). La correction est renvoyée en
> Phase 1, et le README décrit le contournement vérifiable aujourd'hui.

Deux inexactitudes de plus ont été corrigées au passage, relevées en relisant : l'arborescence
décrivait la CI comme « build → tests → déploiement », et une note affirmait qu'`apps/api` « n'a pas de
`tsc` » — plus vrai depuis le lot 2. Le tableau des commandes a reçu `typecheck`, `verify:lockfile` et
`format:check`, qui en étaient absents.

### Q6 — le permis est conservé, délibérément

`modules/profile/contract/src/contract.ts` et `README.md §3` portent désormais la même justification :
la doctrine « pas de données personnelles » vise les **identifiants physiques** — ceux qui permettent de
joindre, de localiser ou de trier sur l'état civil. Un permis B est une qualification professionnelle,
attendue dans les offres qui mentionnent des déplacements, et il ne désigne personne.

Écrit dans le contrat et non seulement dans le README, avec la consigne explicite de **ne pas le retirer
par analogie** : sans cela, la prochaine relecture de la doctrine le supprimera comme un oubli.

### Licence

`LICENSE` — MIT, `Copyright (c) 2026 nseng-dev` — et `"license": "MIT"` dans `package.json`.

> **Pourquoi le lock n'a pas été touché.** L'entrée racine du lock porte déjà un `engines` différent de
> celui de `package.json` (`>=22.22.3` contre `>=22.22.3 <23` + `npm`), héritage assumé du lot 2 : npm
> resynchronise ces champs, mais en supprimant `@angular/animations` au passage. `npm ci` ne contrôle ni
> `license` ni `engines`, et la garde du lock non plus — vérifié : `npm ci` passe, 193/0. **Aucune
> édition du lock n'était donc nécessaire, et aucune n'a été faite** : le lock est identique à celui de
> `main`.

### `CLAUDE.md` — nouveau

Importe `@AGENTS.md`, puis **deux parties nettement séparées** :

| Partie                             | Contenu                                                                                                                                                                                                                                                                                                                |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1 — Standard commun** (9 règles) | lecture du suivi en début de session · commandes de vérification · npm 12.2.0 partout · boucle _branche → checks → PR → arrêt_ · interdiction de déployer · une seule PR à la fois · Conventional Commits et titre de PR · 7 règles de protection de `main` · 2 règles de CI · journal des leçons · règles du lockfile |
| **2 — Spécifique ns-studio**       | architecture (Worker unique, `run_worker_first`, shell + iframe) · workerd/macOS 12.6 et ses quatre conséquences · 11 points sensibles                                                                                                                                                                                 |

La règle demandée le 2026-11-03 est en **§1**, en tête de la partie 1 : _« Au début de chaque session,
lis d'abord `docs/audit/suivi-phase-<n>.md` et `docs/automation/lecons.md` : c'est là qu'est l'état du
travail, pas dans la mémoire de la session. »_

`AGENTS.md` a été corrigé sur les deux points où il contredisait désormais la réalité : la description
de `npm run deploy`, et le style de commit (« short imperative messages » → Conventional Commits, avec
la règle du titre de PR). Les deux sont des faits sur le dépôt, pas des préférences : les laisser faux
aurait produit la même dérive que le README.

### Fichiers touchés

| Fichier                                    | Changement                                                                                   |
| ------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `LICENSE`                                  | **nouveau** — MIT, `Copyright (c) 2026 nseng-dev`                                            |
| `CLAUDE.md`                                | **nouveau** — importe `@AGENTS.md`, standard commun + spécifique ns-studio                   |
| `.github/workflows/ci.yml`                 | les deux gardes : `deploy` depuis `main` seule, `cancel-in-progress` limité aux PR           |
| `package.json`                             | `deploy` = 4 gardes puis `wrangler deploy` ; `"license": "MIT"`                              |
| `README.md`                                | 3 affirmations fausses corrigées, Q6, 2 inexactitudes relevées en relisant, tableau complété |
| `AGENTS.md`                                | `npm run deploy` et `npm run typecheck`/`verify:lockfile` ; Conventional Commits             |
| `modules/profile/contract/src/contract.ts` | **Q6** — commentaire : le champ `permis` est une exception délibérée                         |
| `package-lock.json`                        | **non touché** (voir ci-dessus)                                                              |

### La CI confirme

PR [#3](https://github.com/nseng-dev/ns-studio/pull/3), exécution
[41550525245](https://github.com/nseng-dev/ns-studio/actions/runs/41550525245) : **11 étapes sur 11 au
vert en 46 s**, et job de déploiement **`skipping`** — ce qui vérifie au passage la première des deux
nouvelles gardes dans le seul cas qu'une PR peut éprouver (`pull_request` ≠ `workflow_dispatch`). La
condition sur `github.ref` ne sera, elle, éprouvée qu'au premier déclenchement manuel.

### Observation sans conséquence

`wrangler deploy --dry-run` annonce « Read **10** files from the assets directory » alors que
`apps/web/dist/web/browser` en contient **8**. L'écart n'est pas une régression de ce lot : le dossier
est byte-identique à l'archive du lot 0, donc son contenu n'a pas pu changer ici. Non expliqué,
non bloquant.

> **Expliqué au lot 4** : l'écart est resté à +2 quand le dossier est passé à 9 fichiers (« Read 11 »),
> soit le nombre de sous-dossiers de `browser/`. Wrangler compte les répertoires avec les fichiers.
> Voir « L'observation du lot 3 est expliquée ».

---

## Lot 4 — Détail

### Le problème

Aucun en-tête de sécurité n'était posé : ni `X-Content-Type-Options`, ni `Referrer-Policy`, ni
politique de cadrage, ni CSP. Sur un site dont tout le contenu est public, le risque n'est pas la
fuite de données — c'est le cadrage par un tiers et le reniflement de type.

La contrainte qui structure tout le lot est documentée par Cloudflare :

> _custom headers defined in the `_headers` file are not applied to responses generated by your
> Worker code_

**Un seul fichier ne suffit donc pas.** `_headers` couvre les pages et les assets servis par
Workers Static Assets ; les réponses de `/api/*`, produites par le code, n'en voient rien.

### Le résultat

| Ce qui répond                             | Mécanisme                                        | Fichier                    |
| ----------------------------------------- | ------------------------------------------------ | -------------------------- |
| `/`, `/profile`, `/remotes/*`, les assets | `_headers`, lu par Workers Static Assets         | `apps/web/public/_headers` |
| `/api/*`                                  | `secureHeaders` de Hono (4.13.7, export présent) | `apps/api/src/index.ts`    |

Cinq en-têtes, déclarés **à l'identique** des deux côtés :

| En-tête                               | Valeur                                                                                                                                                                                                                                                               |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `X-Content-Type-Options`              | `nosniff`                                                                                                                                                                                                                                                            |
| `Referrer-Policy`                     | `strict-origin-when-cross-origin` — Hono pose `no-referrer` par défaut, surchargé pour aligner                                                                                                                                                                       |
| `X-Frame-Options`                     | `SAMEORIGIN`                                                                                                                                                                                                                                                         |
| `Permissions-Policy`                  | 13 fonctions neutralisées (`accelerometer`, `camera`, `geolocation`, `microphone`, `payment`, `usb`…)                                                                                                                                                                |
| `Content-Security-Policy-Report-Only` | `default-src 'self'` · `base-uri 'self'` · `object-src 'none'` · `script-src 'self'` · `style-src 'self' 'unsafe-inline'` · `img-src 'self' data:` · `font-src 'self'` · `connect-src 'self'` · `frame-src 'self'` · `frame-ancestors 'self'` · `form-action 'self'` |

### Pourquoi `X-Frame-Options` en plus de `frame-ancestors`

Le plan ne prévoyait que `frame-ancestors 'self'`. Mais la CSP part en **`Report-Only`** : elle
signale et ne bloque rien. Sans `X-Frame-Options`, ce lot aurait livré **zéro** protection réelle
contre le cadrage par un tiers — l'exact objectif annoncé. `SAMEORIGIN` est compatible avec
l'architecture : la shell encadre `/remotes/profile/` sur la **même origine**.

### Pourquoi la CSP reste en Report-Only

`style-src` doit accepter `'unsafe-inline'` : Angular injecte les styles de composant dans des
balises `<style>`. Et `img-src` doit accepter `data:` — le favicon est une icône SVG en ligne
(`apps/web/src/index.html`). Appliquer une CSP dont on n'a pas encore observé les violations
reviendrait à parier sur une page qu'on ne peut pas tester localement : `wrangler dev` est
impossible sur ce poste. Report-Only est le mode qui **mesure avant d'imposer**.

### Pourquoi `Strict-Transport-Security` n'est pas posé

C'est le seul en-tête de la liste dont l'effet **survive à son retrait** : le navigateur le
mémorise — 180 jours avec le défaut de Hono. Le poser avant que le nom de domaine définitif soit
arrêté engage une adresse qu'on ne pourra pas reprendre. Il est explicitement désactivé
(`strictTransportSecurity: false`), et un test interdit qu'il revienne par défaut.

### La garde qui remplace le `curl -I` qu'on ne peut pas lancer

Deux déclarations pour une même politique dérivent tôt ou tard, et la divergence ne serait visible
qu'après un déploiement. `apps/api/test/en-tetes.test.ts` (8 tests) la rend visible en CI :

| Test                                 | Ce qu'il interdit                                                                                     |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| parité `_headers` ↔ Worker           | qu'un en-tête change d'un côté et pas de l'autre — comparaison nom par nom, valeur par valeur         |
| `public/` ne contient que `_headers` | qu'un fichier déposé là parte en production sans qu'on l'ait voulu _(ajustement 5a, rendu permanent)_ |
| limites de la plateforme             | plus de 100 règles ou une ligne de plus de 2 000 caractères                                           |
| en-têtes sur les erreurs de l'API    | que le filet `notFound` réponde sans `nosniff` ni CSP                                                 |
| CSP appliquée absente                | que le passage en mode appliqué se produise par effet de bord                                         |
| HSTS absent                          | que le défaut de Hono le réintroduise                                                                 |
| inventaire des défauts de Hono       | qu'une montée de version de Hono change ses douze en-têtes par défaut en silence                      |
| corps de `GET /api/profile` inchangé | que le middleware touche au contenu ou au `Cache-Control`                                             |

`npm test` passe donc de **7 à 15 tests**, et son script construit d'abord le contrat — comme le
fait déjà `typecheck` — parce que le Worker importe `@ns-studio/profile-contract` par son `dist/`,
qui n'existe pas sur un dépôt fraîchement cloné.

### Les sept défauts de Hono qui ne couvrent que l'API

`secureHeaders()` pose douze en-têtes par défaut. Sept ne sont pas déclarés dans `_headers`, donc
ne couvrent pas les pages : `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`,
`Origin-Agent-Cluster`, `X-DNS-Prefetch-Control`, `X-Download-Options`,
`X-Permitted-Cross-Domain-Policies`, `X-XSS-Protection: 0`.

Sur une réponse JSON, trois sont inertes (`COOP` et `Origin-Agent-Cluster` ne valent que pour un
document de premier niveau, `X-Download-Options` pour un téléchargement) et `CORP: same-origin` est
utile : il empêche un autre site d'embarquer ce JSON en sous-ressource. **Les étendre aux pages est
un point ouvert** : `COOP` et `Origin-Agent-Cluster` changent le comportement d'un document et de
son iframe, et ce comportement n'est observable qu'après un déploiement. Phase 1. Entre-temps, le
test d'inventaire fige la liste : elle ne bougera pas sans qu'on le voie.

### Fichiers touchés

| Fichier                          | Changement                                                                    |
| -------------------------------- | ----------------------------------------------------------------------------- |
| `apps/web/public/_headers`       | **nouveau** — 1 règle `/*`, 5 en-têtes, ligne la plus longue : 267 caractères |
| `apps/web/angular.json`          | `"assets": []` → `[{ "glob": "**/*", "input": "public" }]`                    |
| `apps/api/src/index.ts`          | `secureHeaders` monté sur `/api/*`, valeurs explicites, HSTS désactivé        |
| `apps/api/test/en-tetes.test.ts` | **nouveau** — 8 tests de parité et de non-régression                          |
| `apps/api/tsconfig.json`         | `include` couvre `test/**/*.ts`                                               |
| `package.json`                   | `test` construit le contrat et couvre `apps/api/test/*.test.ts`               |
| `README.md`                      | section « Les en-têtes de sécurité tiennent en deux fichiers, pas un »        |

Aucune dépendance ajoutée : `hono` 4.13.7 était déjà installée, et `hono/secure-headers` en fait
partie. **`package-lock.json` n'est pas touché.**

### Non-régression — le critère est tenu exactement

L'archive du lot 0 (`~/backups/ns-studio-dist-2026-11-02.tar.gz`) et la sortie de `npm run build`
après `rm -rf node_modules && npm ci`, comparées par empreinte SHA-256 :

```
0a1
> 922dc4bc9bf5b578d8b612ec9d48ed331c51bc33c4481b24ba4f0293e57c234a  browser/_headers
```

**Un seul écart : une ligne ajoutée.** Les 8 fichiers d'origine — `index.html` compris, ainsi que
les empreintes `main-MYPEIG5F.js`, `chunk-BO7PRPI4.js`, `chunk-56T6K4PF.js`, `styles-T33H5HNF.css`
et les trois fichiers du remote — sont **identiques octet pour octet**. Le dossier `public/` ne
contenait que `_headers` au moment de l'activer dans `angular.json` _(ajustement 5a vérifié, puis
transformé en test)_.

Le contenu copié dans la sortie est identique au fichier source (`diff` à vide) : Angular ne
transforme pas les assets.

### L'observation du lot 3 est expliquée

`wrangler deploy --dry-run` annonçait « Read **10** files » pour **8** fichiers sur le disque. Il
annonce maintenant « Read **11** files » pour **9**. L'écart est resté à **+2**, soit exactement le
nombre de **sous-dossiers** de `browser/` (`remotes/` et `remotes/profile/`). Wrangler compte donc
les répertoires avec les fichiers. Deux points de mesure concordants, pas une lecture du code de
wrangler : l'explication est une inférence, suffisante pour clore une observation non bloquante.

### La CI confirme

PR [#4](https://github.com/nseng-dev/ns-studio/pull/4), exécution
[41715825848](https://github.com/nseng-dev/ns-studio/actions/runs/41715825848) : **11 étapes sur 11
au vert en 51 s**, job de déploiement **`skipping`**. L'étape « Le profil est valide » exécute
désormais 15 tests au lieu de 7 : la parité `_headers` ↔ Worker est donc vérifiée en CI, sur une
machine qui n'est pas ce poste.

### Ce qui n'est vérifiable qu'après déploiement

`wrangler dev` reste impossible (macOS 12.6 < 13.5). En PR, la CI prouve que la configuration est
valide, que `_headers` atterrit dans la sortie du build et que les deux déclarations concordent.
Trois choses restent hors de portée d'ici le déploiement :

1. que Cloudflare **applique** bien `_headers` aux réponses d'assets ;
2. que `GET /_headers` ne renvoie **pas le contenu du fichier** — un fichier de configuration servi
   publiquement est une fuite _(ajustement 5b)_. ⚠️ Le plan attendait un **404**, et c'est un
   critère faux ici : `wrangler.jsonc` déclare `not_found_handling: "single-page-application"`,
   donc un chemin exclu du manifeste d'assets rend `index.html` en **200**. Un `200` n'est pas une
   fuite, et un `curl -I` ne permet pas de trancher. **Le critère est le corps de la réponse :**
   `curl -sS …/_headers | head -c 200` doit afficher `<!doctype html>…` et **jamais** les lignes
   `X-Content-Type-Options…` du fichier. Attendu détaillé à l'étape 2, plus bas.
3. ce que la CSP Report-Only **signale** dans la console, dans les **deux** documents : la shell et
   l'iframe `/remotes/profile/` _(ajustement 5c)_.

Les commandes exactes sont dans « Ce qui reste de ton côté », étapes 2 et 3.

---

## Journal des décisions

| Date       | Décision                                                                                                                                                                                                                                  |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-11-02 | **npm 12.2.0** comme version unique, en local et en CI. `engines.node` de npm 12.2.0 = `^22.22.2 \|\| ^24.15.0 \|\| >=26.0.0` → accepte Node 22.23.2 (vérifié par `semver.satisfies`). Pas de repli vers npm 11.x.                        |
| 2026-11-02 | Déploiement isolé dans un job `workflow_dispatch` (YAML pur, relisible en PR, aucune écriture de configuration distante).                                                                                                                 |
| 2026-11-02 | Aucun secret Cloudflare posé en Phase 0 : déploiement 100 % local.                                                                                                                                                                        |
| 2026-11-02 | Réparation du lock **sans suppression** ; critère bloquant : le diff ne contient que des ajouts.                                                                                                                                          |
| 2026-11-03 | `worker-configuration.d.ts` **non généré** en Phase 0 : `wrangler types` exige workerd, indisponible sur ce poste, et le Worker ne lit aucun binding. Décision reportée au jour où il lira `env`.                                         |
| 2026-11-03 | Vérification de types **indépendante de la construction** : le Worker vise les sources du contrat ; un `tsconfig.typecheck.json` dédié évite de toucher la configuration d'`ng build`.                                                    |
| 2026-11-03 | Toute addition au lock reste **chirurgicale** tant que `@angular/animations` doit y être retenue à la main : `npm install --package-lock-only` la supprime.                                                                               |
| 2026-11-03 | **On arrête de réessayer le relevé wrangler.** Trois échecs, une seule cause, hors de ma portée. Déplacé en **étape 0 du déploiement manuel** — le seul moment où l'identifiant est à la fois nécessaire et juste.                        |
| 2026-11-03 | Licence **MIT** (`Copyright (c) 2026 nseng-dev`). Le lock n'est pas resynchronisé pour autant : `license` n'est contrôlé ni par `npm ci` ni par la garde, et toucher au lock supprimerait `@angular/animations`.                          |
| 2026-11-03 | `npm run deploy` devient une **garde** (lockfile → test → typecheck → build) et non un raccourci. C'est ce qui rend vraie l'affirmation du README sur le chemin local, comme `needs: ci` la rend vraie en CI.                             |
| 2026-11-03 | La limite d'impression est **documentée, pas corrigée**, en Phase 0 : la corriger changerait le comportement visible. Contournement décrit (`/remotes/profile/`), correction renvoyée en Phase 1.                                         |
| 2026-11-03 | `AGENTS.md` est corrigé là où il devient faux, plutôt que seulement surchargé par `CLAUDE.md` : un document de référence faux dérive, même si un autre le contredit.                                                                      |
| 2026-11-03 | **Deux mécanismes d'en-têtes, une seule politique, et un test qui l'impose.** `_headers` ne couvre pas les réponses du Worker (documentation Cloudflare) : la parité entre les deux déclarations devient un test, pas une convention.     |
| 2026-11-03 | **`X-Frame-Options: SAMEORIGIN` ajouté au plan.** La CSP part en Report-Only, donc `frame-ancestors` ne bloque rien : sans cet en-tête, le lot n'aurait livré aucune protection réelle contre le cadrage.                                 |
| 2026-11-03 | **`Strict-Transport-Security` non posé en Phase 0** : seul en-tête dont l'effet survive au retrait (mémorisé 180 jours). À poser une fois le nom de domaine définitif arrêté. Un test interdit qu'il revienne par le défaut de Hono.      |
| 2026-11-03 | **Les sept défauts de Hono qui ne couvrent que l'API sont inventoriés dans un test, pas étendus aux pages.** `COOP` et `Origin-Agent-Cluster` changent le comportement d'un document et de son iframe : non observable avant déploiement. |
| 2026-11-03 | **`npm test` construit d'abord le contrat**, comme `typecheck` : le test des en-têtes importe le Worker, donc le `dist/` du contrat, absent d'un dépôt fraîchement cloné.                                                                 |

---

## Ce qui reste de ton côté (fin de phase)

1. ~~Activer la **protection de `main`**~~ — ✅ fait le 2026-11-02, voir la section dédiée.
2. Créer le **token Cloudflare** (modèle « Edit Cloudflare Workers ») et poser le secret `CLOUDFLARE_API_TOKEN`.

### Le déploiement manuel, en deux temps

|                Étape                 | Quoi                                                                                                                                             |
| :----------------------------------: | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **0** — _préalable, à ne pas sauter_ | **Relever la version en production** : `npx wrangler login && npx wrangler deployments list && npx wrangler versions list`. Me coller la sortie. |
|                **1**                 | **Déployer** : `npm run deploy` (les quatre gardes passent d'abord), ou _Actions → CI → Run workflow_ sur `main`.                                |
|                **2**                 | **Relever les en-têtes** du lot 4 — `curl` ci-dessous, dont le contrôle que `/_headers` ne renvoie **pas le contenu du fichier**.                |
|                **3**                 | **Lire la console** sur les deux documents — procédure ci-dessous. C'est ce relevé qui décidera du passage de la CSP en mode appliqué.           |

> **Pourquoi l'étape 0 est un préalable et non une formalité.** L'archive du lot 0 ne couvre que
> les fichiers statiques : elle ne contient ni le code du Worker, ni sa configuration, ni ses
> bindings. Le seul retour arrière complet est `wrangler rollback <id>` — et cet `<id>` est celui
> de la version **que le déploiement va remplacer**. Relevé après l'envoi, il désigne la nouvelle
> version : il ne sert plus à rien. C'est la seule étape de cette liste qui ne se rattrape pas.

### Étape 2 — les en-têtes, après déploiement

```bash
# Les cinq en-têtes sur la shell, sur le remote, puis sur l'API.
curl -sS -I https://ns.latech.workers.dev/ \
  | grep -iE 'content-security|x-content-type|referrer|permissions|x-frame'
curl -sS -I https://ns.latech.workers.dev/profile \
  | grep -iE 'content-security|x-content-type|referrer|permissions|x-frame'
curl -sS -I https://ns.latech.workers.dev/remotes/profile/ \
  | grep -iE 'content-security|x-content-type|referrer|permissions|x-frame'
curl -sS -I https://ns.latech.workers.dev/api/profile \
  | grep -iE 'content-security|x-content-type|referrer|permissions|x-frame'

# Le fichier de configuration ne doit PAS être servi. Le critère est le CORPS, pas le code HTTP.
curl -sS https://ns.latech.workers.dev/_headers | head -c 200

# Non-régression du corps de l'API, en plus des en-têtes (comparaison structurelle, pas textuelle).
curl -sS https://ns.latech.workers.dev/api/profile > /tmp/api-profile.json && python3 -c "
import json, sys
a = json.load(open('/tmp/api-profile.json'))
b = json.load(open('modules/profile/contract/src/data/profile.fr.json'))
print('corps identique au fichier versionné' if a == b else 'ÉCART — le corps a changé')
sys.exit(0 if a == b else 1)
"
```

**Les quatre premières commandes doivent afficher les cinq mêmes lignes** : c'est le contrôle que
`_headers` et le middleware du Worker produisent bien la même politique en conditions réelles — ce
que le test de parité affirme sans pouvoir le prouver hors déploiement. Un écart sur `/api/profile`
seul signale un problème de middleware ; un écart sur les trois premières, un `_headers` non pris
en compte par la plateforme.

**`curl -sS … /_headers | head -c 200` — l'attendu, précisément :**

| Sortie                                                                                                   | Verdict                                                                  |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `<!doctype html>` suivi du `<head>` de la shell Angular                                                  | ✅ **attendu.** Le fichier est exclu du manifeste, le repli SPA répond.  |
| Une page d'erreur, ou une réponse vide                                                                   | ✅ acceptable. Le fichier n'est pas servi — c'est tout ce qui compte.    |
| `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `Content-Security-Policy-Report-Only` | 🔴 **fuite.** Le fichier est servi tel quel : sa politique est publique. |

**Le code HTTP n'est pas le critère.** `wrangler.jsonc` déclare
`not_found_handling: "single-page-application"` : un chemin inconnu rend `index.html` en **200**.
Un `200` est donc normal ici, et un `curl -I` seul — qui n'affiche que les en-têtes — ne permet pas
de conclure. C'est le corps qu'il faut lire, d'où `head -c 200` plutôt que `-I`.

### Étape 3 — la console, sur les deux documents

La shell et l'iframe sont **deux documents** : chacun a sa propre CSP, et la console n'en montre
qu'un à la fois.

1. Ouvrir <https://ns.latech.workers.dev/profile> dans Chrome, **DevTools → Console**. Vider la
   console, puis recharger avec **Cmd+Shift+R**.
2. Relever les lignes commençant par **`[Report Only] Refused to …`** : elles listent ce que la CSP
   **bloquerait** si elle était appliquée.
3. **Basculer sur le document de l'iframe** : dans la barre d'outils de la Console, le sélecteur de
   contexte (à gauche, « top ») → choisir le cadre `/remotes/profile/`. Refaire le relevé.
4. **Network → cliquer la requête du document → Headers** : confirmer
   `content-security-policy-report-only` sur `/profile` **et** sur `/remotes/profile/`.

**Attendu le plus probable** : des violations `style-src` dues aux styles de composant qu'Angular
injecte en `<style>` — c'est précisément la raison du Report-Only. Le critère de passage en mode
appliqué (Phase 1) est **zéro ligne `[Report Only] Refused` dans les deux contextes**.
