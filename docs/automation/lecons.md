# Journal des leçons — vers un standard de sous-projet et des skills Claude Code

Ce fichier alimente deux livrables de fin de phase : `docs/automation/standard-sous-projet.md`
et la liste des skills à créer. Il est complété **à la fin de chaque lot**.

Quatre natures, systématiquement distinguées :

| Marque               | Sens                                                                         |
| -------------------- | ---------------------------------------------------------------------------- |
| 🟦 **générique**     | Va dans le standard, réutilisable dans tout sous-projet                      |
| 🟨 **ns-studio**     | Propre à ce dépôt, ne pas généraliser                                        |
| 🟥 **friction**      | La boucle de travail a coincé : étape floue, attente, vérification manquante |
| ⚙️ **à automatiser** | Devrait devenir un hook, une étape CI ou un script                           |

---

## Lot 0 — Assurer le retour arrière

### 🟦 Générique — à verser au standard

| Leçon                                                                                                                                                              | Pourquoi                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Une sauvegarde de prod Workers = identifiant de version Cloudflare + archive des fichiers ; l'un sans l'autre est incomplet.**                                   | L'archive ne couvre que les assets statiques : elle ne contient ni le code du Worker, ni sa configuration, ni ses bindings. Seul `wrangler rollback <id>` restaure l'ensemble. Inversement, un identifiant seul dépend de la rétention Cloudflare. **Les deux moitiés, relevées avant tout déploiement.** → checklist « sous-projet conforme ». |
| **Une sauvegarde non vérifiée n'est pas une sauvegarde.** Comparer l'archive à la production **fichier par fichier, par empreinte**, avant de la déclarer valable. | Ici c'était vrai (8/8 identiques), mais rien ne le garantissait : le `dist/` est ignoré par Git et pouvait avoir dérivé.                                                                                                                                                                                                                        |
| **Ne jamais combler une donnée de production manquante par une valeur plausible.** Laisser le champ vide et nommer le blocage.                                     | Un identifiant de version inventé produit un `wrangler rollback` qui échoue précisément au moment où on en a besoin — un faux filet est pire que pas de filet.                                                                                                                                                                                  |
| **Les artefacts de sécurité ne vont jamais dans `/tmp`** — vidé au redémarrage. Destination : `~/backups/<projet>-<objet>-<date>/`.                                | Une photo d'avant perdue rend le critère de non-régression invérifiable.                                                                                                                                                                                                                                                                        |
| **La photo d'avant doit inclure le fichier entier, pas seulement un résumé.** Copier `package-lock.json`, pas juste la liste des versions.                         | Le mode `--compare` a besoin de la source complète (`version`, `resolved`, `integrity`).                                                                                                                                                                                                                                                        |
| **Vérifier l'accès aux outils distants au tout début d'une phase**, pas au moment où on en a besoin.                                                               | Le jeton OAuth wrangler avait expiré 35 jours plus tôt : découvert à la première commande.                                                                                                                                                                                                                                                      |
| **Avant d'épingler un outil, vérifier que son `engines` accepte le runtime épinglé du projet.**                                                                    | `npm@12.2.0` → `engines.node = ^22.22.2 \|\| ^24.15.0 \|\| >=26.0.0`, qui accepte bien Node 22.23.2.                                                                                                                                                                                                                                            |

### 🟥 Frictions rencontrées

| Friction                                                             | Détail                                                                                                                                                                                                     | Remède                                                                                                                                                                                   |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Faux négatif d'empreinte sur les redirections**                    | `curl` sans `-L` sur `/index.html` renvoie un corps vide (307 → `/`) ; `sha256` = `e3b0c442…`, celle de la chaîne vide. Deux fichiers sur huit sont apparus « DIFFERENT » à tort.                          | Toute comparaison d'empreinte HTTP doit utiliser `-L` **et** rejeter explicitement l'empreinte de la chaîne vide. ⚙️ à intégrer au script de vérification.                               |
| **Authentification expirée, non rafraîchissable sans interactivité** | Wrangler refuse de rafraîchir un jeton OAuth dans un shell non interactif, même avec `refresh_token` + `offline_access` présents.                                                                          | L'agent **ne doit pas** s'authentifier à la place de l'utilisateur. Le skill doit détecter ce cas, l'annoncer, fournir la commande exacte, et **continuer tout ce qui n'en dépend pas**. |
| **Archéologie manuelle de la cause racine**                          | Trouver _pourquoi_ le lock était cassé a demandé `git log --follow` par version du lock, puis la lecture de 7 logs CI. Deux causes racines distinctes, dont une invisible dans le rapport d'audit initial. | ⚙️ Un skill `diagnostic-ci` devrait automatiser : échecs CI → première occurrence → bissection du fichier fautif.                                                                        |

### ⚙️ À automatiser

- Script de comparaison **archive ↔ production** (suit les redirections, rejette l'empreinte vide).
- Vérification d'accès aux services distants (`gh auth status`, validité du jeton wrangler) en **préambule de phase**.
- `gh secret list` dans la checklist « sous-projet conforme » : ici, l'absence de `CLOUDFLARE_API_TOKEN` a coûté 2 échecs CI avant même le problème de lockfile.

### 🟨 Propre à ns-studio

- Le `dist/` **non versionné était la seule copie de la production** — situation à supprimer en Phase 1 (artefact de build attaché à la release).
- macOS 12.6 interdit workerd : pas de `wrangler dev`, donc toute vérification de runtime est repoussée après déploiement.

---

## Lot 1 — Lockfile multi-plateforme et npm unique

> _À compléter à la fin du lot. Leçons déjà acquises pendant l'enquête :_

### 🟦 Générique — à verser au standard

| Leçon                                                                                                                                   | Pourquoi                                                                                                                                                         |
| --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **« Même outil, même version, en local et en CI. »** Épingler npm explicitement, jamais celui qu'embarque Node.                         | Node 22.23.2 embarque npm 10.9.8, antérieur au correctif de npm/cli#4828 (npm ≥ 11.3.0). Suivre « `nvm use` puis `npm install` » aurait reproduit le bug.        |
| **Un lockfile se vérifie, il ne se suppose pas.** Invariant : toute `optionalDependencies` déclarée doit avoir son entrée dans le lock. | Garde validée empiriquement : lock sain `22edb63` → 202 déclarées / **0 absente** ; lock cassé → 193 déclarées / **172 absentes**. Zéro faux positif.            |
| **Réparer un lock ≠ le régénérer.** Compléter sans supprimer, et prouver que **le diff ne contient que des ajouts** (`--compare`).      | Régénérer ferait monter les versions en douce — exactement ce qu'une phase « réparer sans rien changer d'autre » interdit.                                       |
| **Un renommage de workspaces avec `node_modules` chaud corrompt le lock.** Imposer `rm -rf node_modules` avant tout renommage.          | Cause racine datée : `531106c` (`@latelier/*` → `@kinetiq/*`, `apps/cv` → `apps/profile`), lock −6 829/+2 716, plateformes passées de linux=85/win32=26 à **0**. |
| **Un déploiement ne doit jamais être le chemin par défaut d'un push.** Gate explicite dès le jour 1.                                    | Le README promettait un déploiement automatique sur `main` qui n'a jamais fonctionné, sans garde ni protection de branche.                                       |

### 🟦 Générique — acquis pendant l'exécution du lot

| Leçon                                                                                                                                                                                                                                        | Pourquoi                                                                                                                                                                                             |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **npm ne sait pas réparer son propre lock amputé.** `npm install`, `--package-lock-only` et `--os/--cpu` forcés plafonnent tous au même point : npm ne revisite jamais un parent déjà résolu.                                                | Quatre stratégies mesurées, trois rejetées. Le standard doit documenter la bonne (injection additive + fermeture par npm) plutôt que de laisser chacun redécouvrir l'impasse.                        |
| **Écrire la garde AVANT la réparation, et la valider sur des cas connus.** Ici : lock sain → 0 absente, lock cassé → 172 ; puis 5 cas synthétiques pour le mode `--compare`.                                                                 | Sans cela, la garde aurait été juge et partie. Les cas synthétiques ont d'ailleurs révélé une erreur **dans mon harnais de test** (code de sortie masqué par un `\| sed`), pas dans le script.       |
| **Un critère strict est utile précisément quand il élimine la solution de repli.** Le repli prévu au plan (repartir du dernier lock sain) donnait un lock complet mais **65 montées de version** — invisible sans le critère.                | C'est le critère durci en cours de route qui l'a attrapé. Le standard doit poser le critère **avant** de connaître la difficulté.                                                                    |
| **La meilleure preuve de non-régression est un artefact identique, pas une suite de tests verte.** Build issu du lock réparé = **identique octet pour octet** à la production archivée.                                                      | Les 7 tests portaient tous sur le validateur du contrat : ils seraient restés verts même si le build avait changé. L'empreinte, elle, ne ment pas.                                                   |
| **Ne jamais reconstruire à la main ce qu'un gestionnaire de paquets déduplique.** L'injection est sûre pour des versions **exactes** ; la fermeture transitive (imbrications `vite/node_modules/@emnapi/runtime@1.11.1`…) doit rester à npm. | Première tentative : injection seule → `npm ci` refuse (`Missing: @emnapi/runtime from lock file`). La frontière entre « reconstructible » et « à déléguer » est celle de l'ambiguïté de résolution. |
| **Changer de version majeure d'outil change le comportement, pas seulement les bugs corrigés.** npm 12 bloque 6 scripts d'installation par défaut et abandonne les peer deps optionnelles que npm 10 gardait.                                | À vérifier explicitement lors de tout épinglage : ici sans conséquence (build identique), mais découvert par hasard.                                                                                 |

### 🟥 Frictions rencontrées

| Friction                                                    | Détail                                                                                                                                                                                                                                                                                                                           | Remède                                                                                                                                                                                                                 |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **La méthode prévue au plan ne marchait pas**               | Le plan prescrivait `rm -rf node_modules` + `npm install`. Résultat : 95 optionnelles toujours absentes, dont les trois binaires Linux indispensables au build.                                                                                                                                                                  | Un plan doit distinguer **l'objectif vérifiable** (lock complet + additif) de **la recette supposée**. Le skill doit boucler sur l'objectif, pas sur la recette.                                                       |
| **`git diff --numstat` ment sur un gros fichier structuré** | Le diff annonce **2 649 suppressions** sur le lockfile alors que la réparation n'en contient aucune : `comm -23 <(sort avant) <(sort après)` renvoie **0 ligne perdue**, et les 407 clés communes gardent contenu, ordre des champs et ordre global. Artefacts d'alignement de hunks, dus à l'insertion de 182 blocs entrelacés. | ⚙️ Ne jamais juger l'additivité d'un lockfile sur `git diff` : le juge est la garde sémantique, doublée d'un `comm` sur les lignes triées. À écrire dans le standard, sinon un relecteur humain refusera une PR saine. |
| **Essais destructeurs sur le dépôt réel**                   | Les stratégies A et B ont modifié le lock du dépôt avant d'être jugées mauvaises ; il a fallu `git checkout --` pour revenir.                                                                                                                                                                                                    | ⚙️ Tester les stratégies en **bac à sable** (copie des manifestes + lock) et n'appliquer que la gagnante. C'est ce qui a été fait à partir de la stratégie D.                                                          |

### ⚙️ À automatiser

- `scripts/verifie-lockfile.mjs` en CI **et** en hook pre-push, dans ses deux modes.
- Étape CI `npm install -g npm@<version épinglée>` avant `npm ci`.
- `scripts/repare-lockfile.mjs` : réparation additive réutilisable — à verser au standard.
- Comparaison **build ↔ artefact de référence** par empreinte, comme test de non-régression de phase.
