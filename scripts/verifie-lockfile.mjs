/**
 * Garde du lockfile.
 *
 * **Pourquoi ce script existe.** Le 12/09/2026, un renommage de workspaces effectué avec un
 * `node_modules` encore chaud a déclenché npm/cli#4828 — « Platform-specific optional dependencies
 * not being included in package-lock.json when reinstalling with node_modules present ». Le lock a
 * perdu 172 de ses 193 dépendances optionnelles de plateforme : il ne restait que les binaires
 * `darwin-x64`. Résultat : le projet n'était plus constructible que sur un Mac Intel, et la CI a
 * échoué sept fois de suite sans que personne ne sache pourquoi.
 *
 * Le correctif npm est arrivé en 11.3.0 — mais Node 22.23.2 embarque npm 10.9.8, qui a encore le
 * bug. Épingler npm ne suffit donc pas : il faut une garde qui constate les dégâts, quelle que
 * soit la version de npm qui les a produits.
 *
 * ## Deux modes
 *
 * ```sh
 * node scripts/verifie-lockfile.mjs                      # invariant de complétude
 * node scripts/verifie-lockfile.mjs --compare <ancien>   # la réparation n'ajoute que des entrées
 * ```
 *
 * Le second mode sert pendant une réparation : compléter un lock doit produire **uniquement des
 * ajouts**. Toute version qui bouge est une montée de version déguisée, et doit être refusée.
 */

import { readFileSync } from 'node:fs';
import { argv, exit } from 'node:process';

const RACINE = new URL('..', import.meta.url).pathname;

function litLock(chemin) {
  try {
    return JSON.parse(readFileSync(chemin, 'utf8'));
  } catch (erreur) {
    console.error(`✘ Lecture impossible : ${chemin}`);
    console.error(`  ${erreur instanceof Error ? erreur.message : String(erreur)}`);
    exit(2);
  }
}

/**
 * Une dépendance optionnelle déclarée mais absente du lock est exactement le symptôme de #4828.
 *
 * npm déclare les variantes de plateforme en `optionalDependencies` (vingt pour `oxc-parser`, par
 * exemple) et doit en résoudre **toutes** les entrées, chacune portant ses contraintes `os`/`cpu`.
 * C'est à l'installation que npm choisit celles qu'il déballe — pas à la résolution. Un lock
 * complet est donc multi-plateforme par construction ; s'il ne l'est pas, il est cassé.
 */
function verifieCompletude(lock) {
  const paquets = lock.packages ?? {};
  const manquantes = [];
  let declarees = 0;

  for (const [cle, entree] of Object.entries(paquets)) {
    for (const nom of Object.keys(entree.optionalDependencies ?? {})) {
      declarees += 1;
      // Une optionnelle peut être hissée à la racine ou imbriquée sous son parent.
      const hissee = `node_modules/${nom}`;
      const imbriquee = `${cle}/node_modules/${nom}`;
      if (!paquets[hissee] && !paquets[imbriquee]) {
        manquantes.push({ nom, parent: cle || '(racine)' });
      }
    }
  }

  console.log(`  dépendances optionnelles déclarées : ${declarees}`);
  console.log(`  absentes du lock                   : ${manquantes.length}`);

  if (manquantes.length === 0) {
    console.log('✔ Lockfile complet : toute optionnelle déclarée a son entrée.');
    return true;
  }

  console.error('\n✘ Lockfile incomplet — npm/cli#4828.');
  console.error(
    '  Ce lock ne peut pas être installé sur les plateformes dont les binaires manquent.\n',
  );

  const parParent = new Map();
  for (const { nom, parent } of manquantes) {
    if (!parParent.has(parent)) parParent.set(parent, []);
    parParent.get(parent).push(nom);
  }
  for (const [parent, noms] of parParent) {
    console.error(`  ${parent}`);
    for (const nom of noms.slice(0, 4)) console.error(`    · ${nom}`);
    if (noms.length > 4) console.error(`    · … et ${noms.length - 4} autres`);
  }

  console.error('\n  Réparation (ne JAMAIS supprimer package-lock.json) :');
  console.error('    npm install -g npm@12.2.0   # le correctif est dans npm >= 11.3.0');
  console.error('    rm -rf node_modules');
  console.error('    npm install');
  console.error('    node scripts/verifie-lockfile.mjs --compare <copie du lock d’avant>');
  return false;
}

/**
 * Réparer un lock n'est pas le régénérer.
 *
 * Compléter les entrées manquantes doit être une opération **additive**. Si une entrée déjà
 * présente voit sa `version`, son `resolved` ou son `integrity` changer, ce n'est plus une
 * réparation : c'est une montée de version introduite en douce, dans un commit censé n'en porter
 * aucune. Une entrée qui disparaît est pire encore.
 */
function verifieAjoutsSeulement(lock, ancien) {
  const avant = ancien.packages ?? {};
  const apres = lock.packages ?? {};
  const modifiees = [];
  const supprimees = [];

  for (const [cle, entree] of Object.entries(avant)) {
    const nouvelle = apres[cle];
    if (!nouvelle) {
      supprimees.push(cle);
      continue;
    }
    for (const champ of ['version', 'resolved', 'integrity']) {
      if (entree[champ] !== nouvelle[champ]) {
        modifiees.push({ cle, champ, avant: entree[champ], apres: nouvelle[champ] });
      }
    }
  }

  const ajoutees = Object.keys(apres).filter((cle) => !(cle in avant));

  console.log(
    `  entrées avant / après : ${Object.keys(avant).length} → ${Object.keys(apres).length}`,
  );
  console.log(`  ajoutées              : ${ajoutees.length}`);
  console.log(`  modifiées             : ${modifiees.length}`);
  console.log(`  supprimées            : ${supprimees.length}`);

  let ok = true;

  if (lock.lockfileVersion !== ancien.lockfileVersion) {
    console.error(
      `\n✘ lockfileVersion a changé : ${ancien.lockfileVersion} → ${lock.lockfileVersion}.`,
    );
    console.error(
      '  À valider explicitement : cela peut rompre `npm ci` sur une version plus ancienne de npm.',
    );
    ok = false;
  }

  if (supprimees.length > 0) {
    console.error(`\n✘ ${supprimees.length} entrée(s) ont disparu du lock :`);
    for (const cle of supprimees.slice(0, 10)) console.error(`    · ${cle}`);
    if (supprimees.length > 10) console.error(`    · … et ${supprimees.length - 10} autres`);
    ok = false;
  }

  if (modifiees.length > 0) {
    console.error(
      `\n✘ ${modifiees.length} entrée(s) ont été modifiées — ce n'est plus une réparation :`,
    );
    for (const { cle, champ, avant: a, apres: b } of modifiees.slice(0, 10)) {
      console.error(`    · ${cle} [${champ}]`);
      console.error(`        avant : ${a ?? '(absent)'}`);
      console.error(`        après : ${b ?? '(absent)'}`);
    }
    if (modifiees.length > 10) console.error(`    · … et ${modifiees.length - 10} autres`);
    ok = false;
  }

  if (ok) console.log('✔ Réparation additive : aucune entrée existante modifiée ni supprimée.');
  return ok;
}

/* ---------------- point d'entrée ---------------- */

const indexCompare = argv.indexOf('--compare');
const cheminLock = `${RACINE}package-lock.json`;
const lock = litLock(cheminLock);

console.log(`Lockfile : ${cheminLock}`);

let succes = true;

console.log('\n[1/2] Complétude des dépendances optionnelles');
succes = verifieCompletude(lock) && succes;

if (indexCompare !== -1) {
  const cheminAncien = argv[indexCompare + 1];
  if (!cheminAncien) {
    console.error('\n✘ --compare attend le chemin du lock de référence.');
    exit(2);
  }
  console.log(`\n[2/2] Réparation additive (référence : ${cheminAncien})`);
  succes = verifieAjoutsSeulement(lock, litLock(cheminAncien)) && succes;
} else {
  console.log('\n[2/2] Réparation additive — ignorée (pas de --compare)');
}

exit(succes ? 0 : 1);
