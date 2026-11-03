@AGENTS.md

# Consignes de travail

Ce fichier a **deux parties nettement séparées** :

- la **partie 1** est un standard de sous-projet, réutilisable tel quel ailleurs ;
- la **partie 2** ne vaut que pour ce dépôt.

Ne jamais déplacer une règle de la partie 2 vers la partie 1 sans l'avoir rendue générale.

`AGENTS.md`, importé ci-dessus, décrit la structure et les conventions de code. Ce fichier le
complète et, sur deux points, le **remplace** : le message de commit (Conventional Commits, voir
§5) et ce que fait `npm run deploy` (il rejoue les gardes, voir §2).

---

# Partie 1 — Standard commun

## 1. Au début de chaque session

**Lis d'abord `docs/audit/suivi-phase-<n>.md` et `docs/automation/lecons.md` : c'est là qu'est
l'état du travail, pas dans la mémoire de la session.**

Ces deux fichiers portent le lot en cours, ce qui a été mesuré, ce qui est bloqué et pourquoi, les
décisions déjà prises et les pièges déjà payés. Une session qui démarre sans les avoir lus
recommence une enquête déjà faite, ou contredit une décision déjà arbitrée.

## 2. Les commandes de vérification

Dans cet ordre, avant toute PR :

```bash
nvm use                      # la version de .nvmrc, pas celle du shell
npm install -g npm@12.2.0    # même version qu'en CI — voir §3
rm -rf node_modules && npm ci
npm run verify:lockfile
npm test
npm run typecheck
npm run build
npx wrangler deploy --dry-run
npx prettier --check .
```

Ce sont exactement les étapes du job `ci`. Une PR dont les vérifications locales passent et dont la
CI échoue signale une divergence entre le poste et la CI : c'est elle qu'il faut corriger, pas
contourner.

`npm run deploy` rejoue les quatre premières gardes avant d'appeler wrangler. Ce n'est pas un
raccourci vers `wrangler deploy`.

## 3. Un seul outil, une seule version

**Même outil, même version, en local et en CI.** npm est épinglé explicitement (`12.2.0`), jamais
celui qu'embarque Node : Node 22.23.2 livre npm 10.9.8, antérieur au correctif de npm/cli#4828 — le
bug qui a amputé ce dépôt de 172 de ses 193 dépendances optionnelles de plateforme.

Avant d'épingler un outil, vérifier que son `engines` accepte le runtime épinglé du projet.

## 4. La boucle de travail

**branche → vérifications locales → PR → CI verte → ARRÊT.**

L'arrêt est une étape, pas une politesse. À la fin d'un lot : rapport chiffré, et attente d'une
validation explicite. Ne pas enchaîner sur le lot suivant, ne pas fusionner, ne pas contourner un
blocage en le réinterprétant.

**Une seule PR ouverte à la fois.** Un lot est fusionné avant que le suivant ne commence : deux
branches en vol sur les mêmes fichiers de configuration produisent des conflits que personne n'a
demandés.

**Un blocage se nomme, il ne se comble pas.** Une donnée de production qu'on n'a pas pu relever
reste un champ vide, avec la commande exacte à lancer. Jamais une valeur plausible : un identifiant
de retour arrière inventé échoue précisément au moment où on en a besoin.

**Interdiction de déployer.** L'agent ne déploie pas, ne pose pas de secret, ne s'authentifie pas à
la place de l'utilisateur, et ne modifie pas les réglages du dépôt distant. Il prépare, il vérifie,
il documente la commande. Le déploiement est un geste humain.

## 5. Commits et pull requests

**Conventional Commits**, en français, à l'impératif : `fix: compléter le lockfile multi-plateforme`.

**Le titre de la PR devient le message de commit de `main`** — la fusion est en squash. Il est donc
rédigé en Conventional Commits **dès l'ouverture** de la PR, pas corrigé au moment de fusionner.

Le corps de la PR porte : ce qui change et pourquoi, les commandes de vérification réellement
lancées avec leur résultat, et ce qui reste ouvert.

## 6. Les règles de protection de `main`

Sept règles, à poser à la création du dépôt :

| Règle                                                    | Effet                                                                      |
| -------------------------------------------------------- | -------------------------------------------------------------------------- |
| Pull request obligatoire, **0 approbation** requise      | Travail en solo : la relecture est celle de la CI, pas d'un second humain. |
| Check **« Build et tests » obligatoire**                 | Le job `ci`. Rouge ⇒ fusion impossible.                                    |
| Branche **à jour avec `main`** avant la fusion           | La CI qui valide est celle du code qui atterrit, pas d'une base périmée.   |
| **Conversations résolues** obligatoires                  | Aucune remarque de relecture ne se perd dans une PR fusionnée.             |
| **Historique linéaire**, fusion en **squash uniquement** | Un lot = un commit sur `main`.                                             |
| **Aucun contournement, même administrateur**             | Plus aucun push direct sur `main` — y compris par le propriétaire.         |
| Suppression automatique de la branche après fusion       | Pas de branches mortes à trier.                                            |

## 7. Les deux règles de CI qui protègent la production

| Règle                                                                                                                           | Pourquoi                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Un déploiement manuel ne part que de `main`** : `github.event_name == 'workflow_dispatch' && github.ref == 'refs/heads/main'` | `workflow_dispatch` seul laisse le sélecteur de branche de l'onglet Actions envoyer **n'importe quelle** branche en production.         |
| **Un push n'annule jamais un déploiement en cours** : `cancel-in-progress: ${{ github.event_name == 'pull_request' }}`          | Annuler un run périmé est une économie sur une PR ; sur un déploiement, c'est une interruption au milieu d'un envoi vers la production. |

Et, plus généralement : **un déploiement n'est jamais le chemin par défaut d'un push.** La garde
existe dès le jour 1, pas après le premier accident.

## 8. Le journal des leçons

`docs/automation/lecons.md` est complété **à la fin de chaque lot**, en distinguant quatre natures :
🟦 générique · 🟨 propre au dépôt · 🟥 friction de boucle · ⚙️ à automatiser.

Une friction non consignée se repaie au lot suivant. Le journal n'est pas un compte rendu : c'est la
matière du standard et des skills à venir.

## 9. Le lockfile

- `npm run verify:lockfile` fait partie du réflexe « j'ai touché au lock », dans ses **deux** modes.
- **Réparer un lock ≠ le régénérer** : compléter sans supprimer. Le critère est que le diff ne
  contienne que des **ajouts** (`--compare` contre la photo d'avant).
- Ne jamais juger l'additivité d'un lockfile sur `git diff --numstat` : sur un gros fichier
  structuré, l'alignement des hunks annonce des suppressions qui n'existent pas. Le juge est la
  garde sémantique.
- Avant tout renommage de workspaces : `rm -rf node_modules`. Un renommage à chaud corrompt le lock.

---

# Partie 2 — Spécifique ns-studio

## L'architecture, en une phrase

**Un seul Worker Cloudflare** sert tout : `run_worker_first: ["/api/*"]` aiguille l'API vers Hono,
le reste part en Static Assets (`not_found_handling: "single-page-application"`). Front et API sur
la même origine, donc **aucun CORS**.

La shell Angular (`apps/web`) **n'affiche pas** le profil : elle l'encadre dans une `<iframe>` vers
`/remotes/profile/`. Les deux documents sont servis par la même origine mais restent deux documents
distincts — conséquence à ne pas oublier pour les en-têtes, la CSP et l'impression.

Un **module** est une tranche verticale : `contract/` (types, validation, données), `ui/` (la page
Angular), `api/` (les routes Hono). Les trois bougent ensemble.

## macOS 12.6 : pas de workerd

Ce poste est en macOS 12.6 ; **workerd exige 13.5+** et refuse de démarrer. Conséquences :

- `wrangler dev` est impossible. Le développement local de l'API passe par
  `apps/api/src/dev-node.ts`, qui importe le **même objet `app`** que le Worker et le sert sous
  Node. Ce n'est pas une seconde implémentation.
- `wrangler types` est impossible : il lance workerd pour produire les types du runtime.
  `apps/api/worker-configuration.d.ts` n'existe donc pas. Sans conséquence aujourd'hui — le Worker
  ne lit aucun binding (`ASSETS` est servi par `wrangler.jsonc`, jamais par le code). Le jour où il
  lira `env` : générer ce fichier en CI Linux, ou adopter `@cloudflare/workers-types`.
- `wrangler deploy --dry-run` **fonctionne sans authentification** : la CI valide donc la
  configuration du Worker sans aucun secret.
- Toute vérification de runtime (en-têtes, CSP, aiguillage `run_worker_first`) n'est observable
  **qu'après un déploiement**.

## Points sensibles

| Point                                                                    | À savoir                                                                                                                                                                         |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`dist/` n'est pas versionné et reste la seule copie de la production** | Archivé hors dépôt (`~/backups/`). À remplacer par un artefact de release en Phase 1.                                                                                            |
| **Aucun secret Cloudflare dans le dépôt**                                | `CLOUDFLARE_API_TOKEN` n'est pas posé : le job `deploy` échouerait s'il était déclenché. Le déploiement est 100 % local.                                                         |
| **Le lock est réparé à la main**                                         | `@angular/animations` y est retenue manuellement ; `npm install --package-lock-only` la supprime. Toute addition au lock reste **chirurgicale**, puis garde dans ses deux modes. |
| **`apps/api` n'a pas de `build`, mais a un `tsconfig.json`**             | wrangler assemble le Worker avec esbuild, qui efface les types sans les vérifier. `npm run typecheck` est le seul contrôle du code serveur.                                      |
| **Pour un Worker, `lib: ["ES2022"]` sans `DOM`**                         | Hériter de la configuration Angular laisse compiler `document.title` dans le Worker — et casser à l'exécution.                                                                   |
| **Le contrat est visé par ses sources dans `apps/api/tsconfig.json`**    | En CI, `typecheck` précède `build` : sur un dépôt fraîchement cloné, `dist/` n'existe pas. Et des déclarations périmées masquent exactement l'erreur qu'on cherche.              |
| **Les gabarits Angular ne sont pas couverts par `typecheck`**            | `strictTemplates` est contrôlé par `ng build`, donc par l'étape `build`.                                                                                                         |
| **Trois erreurs TS6059 sur `apps/profile/tsconfig.app.json`**            | Erreurs de **configuration**, pas de types : neutralisées par un `tsconfig.typecheck.json` dédié. Ne jamais toucher `tsconfig.app.json`, que lit `ng build`.                     |
| **npm 12 bloque 6 scripts d'installation**                               | `esbuild` (×2), `workerd`, `lmdb`, `msgpackr-extract`, `@parcel/watcher`. Sans effet sur le build actuel ; à surveiller si un paquet natif est ajouté.                           |
| **Le contenu du profil s'arrête en 07/2021**                             | C'est la donnée, pas un bug. Un seul fichier : `modules/profile/contract/src/data/profile.fr.json`.                                                                              |
| **`permis` est conservé délibérément**                                   | La doctrine « pas de données personnelles » vise les identifiants physiques. Un permis B est une qualification. Ne pas le retirer par analogie.                                  |
| **L'impression depuis la shell est tronquée**                            | L'iframe est plafonnée à `100dvh` et aucune règle `@media print` ne la libère. Contournement : imprimer `/remotes/profile/`. Correction en Phase 1.                              |
