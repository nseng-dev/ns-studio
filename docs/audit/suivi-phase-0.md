# Suivi — Phase 0 : remettre la chaîne de livraison en état

**Objectif** : CI verte, production protégée, **zéro changement de comportement visible** et **zéro montée de version de dépendance**.
**Commit de départ** : `2e97a59` (`main` = `origin/main` = `claude/dev`).
**Plan de référence** : `~/.claude/plans/objectif-global-buzzing-treehouse.md` (v2).

---

## Tableau de bord

|  Lot  | Intitulé                                  | Statut           | Branche                  | PR                                                  | Notes                                                                                                  |
| :---: | ----------------------------------------- | ---------------- | ------------------------ | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **0** | Assurer le retour arrière                 | ✅ **done**      | _(aucune — sans commit)_ | —                                                   | Archive vérifiée contre la prod (8/8). **Relevé Cloudflare bloqué** : jeton OAuth expiré.              |
| **1** | Lockfile multi-plateforme + npm unique    | ✅ **done**      | `fix/lockfile`           | [#1](https://github.com/nseng-dev/ns-studio/pull/1) | Fusionnée le 2026-11-02 (`833fe47`). 182 ajouts / 0 modif / 0 suppr. Build identique octet pour octet. |
| **2** | Typage du Worker                          | 🟡 **in-review** | `fix/typecheck`          | _(à ouvrir)_                                        | `apps/api` et `modules/profile/api` couverts par `tsc`. Aucune erreur de type dans le code applicatif. |
| **3** | Garde de déploiement, doc fidèle, licence | ⬜ todo          | `fix/doc-licence`        | —                                                   | **Périmètre élargi** — voir « Reporté au lot 3 ». Après merge du lot 2.                                |
| **4** | En-têtes de sécurité                      | ⬜ todo          | `fix/headers`            | —                                                   | Après merge du lot 3.                                                                                  |

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

### 🔴 Bloqué — relevé de la version en production

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

**À lancer par toi**, dans ton onglet Terminal :

```bash
cd /Users/nara/Desktop/Nara/Dev/Nara-diy-dev/GitHub/ns-studio && npx wrangler login && npx wrangler deployments list && npx wrangler versions list
```

Me coller la sortie **réelle** : je remplirai le tableau ci-dessus.

> **Impact sur la Phase 0 : faible mais non nul.** Aucun déploiement n'aura lieu pendant la Phase 0,
> donc aucun retour arrière ne devrait être nécessaire. Mais tant que l'identifiant n'est pas relevé,
> la sauvegarde est **incomplète** (cf. portée de l'archive ci-dessus) : il faut le relever
> **avant le déploiement manuel de fin de phase**, pas après.

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

## Reporté au lot 3 — périmètre élargi

Relevé en relisant le fichier CI installé par le lot 1. Rien ici n'est appliqué dans le lot 2 : ces points
partent dans la PR `fix/doc-licence`.

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
  jamais un déploiement en cours**.

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

### 🟥 Friction — `npm install --package-lock-only` défait la réparation du lot 1

Ajouter la dépendance d'espace de travail par la commande normale a produit **3 ajouts et 19 suppressions**
dans le lock pour une ligne voulue : npm 12 a **supprimé** l'entrée `@angular/animations` — la peer optionnelle
réinjectée à la main au lot 1 — et resynchronisé `engines` au passage.

Revenu en arrière, puis **édition chirurgicale** : une ligne ajoutée à l'entrée `apps/api` du lock. Les deux
modes de la garde repassent ensuite au vert, dont `--compare` contre la photo du lot 0 : **0 modification,
0 suppression**. Consigné au journal des leçons.

---

## Journal des décisions

| Date       | Décision                                                                                                                                                                                                           |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-11-02 | **npm 12.2.0** comme version unique, en local et en CI. `engines.node` de npm 12.2.0 = `^22.22.2 \|\| ^24.15.0 \|\| >=26.0.0` → accepte Node 22.23.2 (vérifié par `semver.satisfies`). Pas de repli vers npm 11.x. |
| 2026-11-02 | Déploiement isolé dans un job `workflow_dispatch` (YAML pur, relisible en PR, aucune écriture de configuration distante).                                                                                          |
| 2026-11-02 | Aucun secret Cloudflare posé en Phase 0 : déploiement 100 % local.                                                                                                                                                 |
| 2026-11-02 | Réparation du lock **sans suppression** ; critère bloquant : le diff ne contient que des ajouts.                                                                                                                   |
| 2026-11-03 | `worker-configuration.d.ts` **non généré** en Phase 0 : `wrangler types` exige workerd, indisponible sur ce poste, et le Worker ne lit aucun binding. Décision reportée au jour où il lira `env`.                  |
| 2026-11-03 | Vérification de types **indépendante de la construction** : le Worker vise les sources du contrat ; un `tsconfig.typecheck.json` dédié évite de toucher la configuration d'`ng build`.                             |
| 2026-11-03 | Toute addition au lock reste **chirurgicale** tant que `@angular/animations` doit y être retenue à la main : `npm install --package-lock-only` la supprime.                                                        |

---

## Ce qui reste de ton côté (fin de phase)

1. ~~Activer la **protection de `main`**~~ — ✅ fait le 2026-11-02, voir la section dédiée.
2. Créer le **token Cloudflare** (modèle « Edit Cloudflare Workers ») et poser le secret `CLOUDFLARE_API_TOKEN`.
3. **Déployer manuellement.**
4. Lancer les **`curl -I`** du lot 4 (dont le 404 attendu sur `/_headers`).
5. **Vérifier la console** selon la procédure CSP Report-Only.
