/**
 * Réparation additive d'un package-lock.json amputé par npm/cli#4828.
 *
 * npm refuse de revisiter un parent déjà résolu : il ne recomplètera donc jamais les entrées
 * de plateforme perdues. Mais ces entrées sont reconstructibles sans la moindre ambiguïté,
 * parce que les parents déclarent leurs bindings en **version exacte**. Il n'y a rien à
 * « résoudre » : seulement à aller chercher, pour une version connue, l'URL, l'empreinte et les
 * contraintes os/cpu publiées par le registre.
 *
 * C'est exactement ce que fait le correctif npm lui-même (« adds proper lock entries — version,
 * resolved URL, registry integrity, os/cpu fields — for all platform bindings »).
 *
 * Le script n'écrase jamais une entrée existante : il n'en ajoute que de nouvelles.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { argv, exit } from 'node:process';

const chemin = argv[2];
if (!chemin) {
  console.error('usage : node repare-lockfile.mjs <package-lock.json>');
  exit(2);
}

const lock = JSON.parse(readFileSync(chemin, 'utf8'));
const paquets = lock.packages;

/** Recense (parent, nom, version exacte) pour chaque optionnelle absente. */
function manquantes() {
  const liste = [];
  for (const [cle, entree] of Object.entries(paquets)) {
    for (const [nom, version] of Object.entries(entree.optionalDependencies ?? {})) {
      const hissee = `node_modules/${nom}`;
      const imbriquee = `${cle}/node_modules/${nom}`;
      if (paquets[hissee] || paquets[imbriquee]) continue;
      liste.push({ parent: cle, nom, version });
    }
  }
  return liste;
}

const aFaire = manquantes();
console.log(`entrées à reconstruire : ${aFaire.length}`);
if (aFaire.length === 0) exit(0);

/** Métadonnées publiées pour une version précise. Une requête par paquet, mises en cache. */
const cache = new Map();
async function metadonnees(nom, version) {
  const cle = `${nom}@${version}`;
  if (cache.has(cle)) return cache.get(cle);
  const url = `https://registry.npmjs.org/${nom.replace('/', '%2f')}/${version}`;
  const reponse = await fetch(url);
  if (!reponse.ok) throw new Error(`${cle} : HTTP ${reponse.status}`);
  const m = await reponse.json();
  cache.set(cle, m);
  return m;
}

const lots = [];
for (let i = 0; i < aFaire.length; i += 8) lots.push(aFaire.slice(i, i + 8));

let ajoutees = 0;
const echecs = [];

for (const lot of lots) {
  const resultats = await Promise.allSettled(
    lot.map(async (item) => ({ item, meta: await metadonnees(item.nom, item.version) })),
  );

  for (const r of resultats) {
    if (r.status === 'rejected') {
      echecs.push(String(r.reason));
      continue;
    }
    const { item, meta } = r.value;

    // Hissée si le nom est libre ; imbriquée si une AUTRE version occupe déjà la racine.
    const hissee = `node_modules/${item.nom}`;
    const existante = paquets[hissee];
    const cle =
      !existante || existante.version === item.version
        ? hissee
        : `${item.parent}/node_modules/${item.nom}`;

    if (paquets[cle]) continue; // jamais d'écrasement

    const entree = {
      version: meta.version,
      resolved: meta.dist.tarball,
      integrity: meta.dist.integrity,
    };
    // L'ordre des champs suit celui qu'écrit npm, pour un diff lisible.
    if (meta.cpu) entree.cpu = meta.cpu;
    entree.optional = true;
    if (meta.os) entree.os = meta.os;
    if (meta.libc) entree.libc = meta.libc;
    if (meta.engines) entree.engines = meta.engines;
    if (meta.dependencies) entree.dependencies = meta.dependencies;
    if (meta.bin) entree.bin = meta.bin;

    paquets[cle] = entree;
    ajoutees += 1;
  }
}

if (echecs.length > 0) {
  console.error(`\n✘ ${echecs.length} échec(s) de récupération :`);
  for (const e of echecs.slice(0, 10)) console.error(`    · ${e}`);
  exit(1);
}

// Réordonner les clés : npm trie les paquets, et un lock non trié produit un diff illisible.
const triees = Object.fromEntries(
  Object.entries(paquets).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
);
lock.packages = triees;

writeFileSync(chemin, `${JSON.stringify(lock, null, 2)}\n`);
console.log(`✔ ${ajoutees} entrée(s) ajoutée(s). Aucune entrée existante touchée.`);
