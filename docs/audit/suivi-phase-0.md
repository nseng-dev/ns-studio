# Suivi — Phase 0 : remettre la chaîne de livraison en état

**Objectif** : CI verte, production protégée, **zéro changement de comportement visible** et **zéro montée de version de dépendance**.
**Commit de départ** : `2e97a59` (`main` = `origin/main` = `claude/dev`).
**Plan de référence** : `~/.claude/plans/objectif-global-buzzing-treehouse.md` (v2).

---

## Tableau de bord

|  Lot  | Intitulé                                  | Statut           | Branche                  | PR  | Notes                                                                                     |
| :---: | ----------------------------------------- | ---------------- | ------------------------ | --- | ----------------------------------------------------------------------------------------- |
| **0** | Assurer le retour arrière                 | ✅ **done**      | _(aucune — sans commit)_ | —   | Archive vérifiée contre la prod (8/8). **Relevé Cloudflare bloqué** : jeton OAuth expiré. |
| **1** | Lockfile multi-plateforme + npm unique    | 🟡 **in-review** | `fix/lockfile`           | —   | Lock complet, **182 ajouts / 0 modif / 0 suppr**. Build identique octet pour octet.       |
| **2** | Typage du Worker                          | ⬜ todo          | `fix/typecheck`          | —   | Après merge du lot 1.                                                                     |
| **3** | Garde de déploiement, doc fidèle, licence | ⬜ todo          | `fix/doc-licence`        | —   | Après merge du lot 2.                                                                     |
| **4** | En-têtes de sécurité                      | ⬜ todo          | `fix/headers`            | —   | Après merge du lot 3.                                                                     |

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

## Journal des décisions

| Date       | Décision                                                                                                                                                                                                           |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-11-02 | **npm 12.2.0** comme version unique, en local et en CI. `engines.node` de npm 12.2.0 = `^22.22.2 \|\| ^24.15.0 \|\| >=26.0.0` → accepte Node 22.23.2 (vérifié par `semver.satisfies`). Pas de repli vers npm 11.x. |
| 2026-11-02 | Déploiement isolé dans un job `workflow_dispatch` (YAML pur, relisible en PR, aucune écriture de configuration distante).                                                                                          |
| 2026-11-02 | Aucun secret Cloudflare posé en Phase 0 : déploiement 100 % local.                                                                                                                                                 |
| 2026-11-02 | Réparation du lock **sans suppression** ; critère bloquant : le diff ne contient que des ajouts.                                                                                                                   |

---

## Ce qui reste de ton côté (fin de phase)

1. Activer la **protection de `main`** (PR obligatoire + check CI obligatoire).
2. Créer le **token Cloudflare** (modèle « Edit Cloudflare Workers ») et poser le secret `CLOUDFLARE_API_TOKEN`.
3. **Déployer manuellement.**
4. Lancer les **`curl -I`** du lot 4 (dont le 404 attendu sur `/_headers`).
5. **Vérifier la console** selon la procédure CSP Report-Only.
