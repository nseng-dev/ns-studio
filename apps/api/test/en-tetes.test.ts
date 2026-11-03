/**
 * Les en-têtes de sécurité sont posés par **deux** mécanismes qui ne se parlent pas :
 * `apps/web/public/_headers`, lu par Cloudflare Workers Static Assets pour les pages et les
 * assets, et le middleware `secureHeaders` de Hono pour les réponses du Worker (`/api/*`).
 * La documentation Cloudflare est explicite : les en-têtes de `_headers` ne s'appliquent pas aux
 * réponses produites par le code.
 *
 * Deux déclarations pour une même politique, c'est une dérive annoncée. Ces tests l'interdisent :
 * ils comparent, en-tête par en-tête, ce que `_headers` déclare et ce que le Worker envoie
 * réellement. Un `curl -I` ne peut le faire qu'après un déploiement — ici, c'est vérifié en CI.
 */

import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import app from '../src/index.js';

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const dossierPublic = resolve(racine, 'apps/web/public');

/**
 * Lit la règle `/*` de `_headers`. Le format est celui de Cloudflare : une ligne de chemin en
 * colonne 0, puis les en-têtes indentés, `#` pour les commentaires.
 */
const litRegleFourreTout = (): Map<string, string> => {
  const lignes = readFileSync(resolve(dossierPublic, '_headers'), 'utf8').split('\n');
  const entetes = new Map<string, string>();
  let dansLaRegle = false;

  for (const ligne of lignes) {
    if (ligne.trim() === '' || ligne.trimStart().startsWith('#')) {
      continue;
    }
    if (!/^\s/.test(ligne)) {
      dansLaRegle = ligne.trim() === '/*';
      continue;
    }
    if (dansLaRegle) {
      const separateur = ligne.indexOf(':');
      assert.notEqual(separateur, -1, `Ligne d'en-tête sans « : » : ${ligne}`);
      entetes.set(
        ligne.slice(0, separateur).trim().toLowerCase(),
        ligne.slice(separateur + 1).trim(),
      );
    }
  }

  assert.ok(entetes.size > 0, 'La règle « /* » de _headers est vide ou absente.');
  return entetes;
};

/** Les en-têtes que `_headers` et le Worker doivent déclarer à l'identique. */
const ENTETES_DU_CONTRAT = new Set(litRegleFourreTout().keys());

test("le dossier public d'Angular ne contient que `_headers`", () => {
  // `angular.json` copie `public/**/*` dans la sortie du build. Tout fichier ajouté ici part
  // donc en production, et fait diverger l'artefact de l'archive de référence.
  assert.deepEqual(readdirSync(dossierPublic).sort(), ['_headers']);
});

test('`_headers` respecte les limites de la plateforme : 100 règles, 2 000 caractères par ligne', () => {
  const lignes = readFileSync(resolve(dossierPublic, '_headers'), 'utf8').split('\n');
  const regles = lignes.filter(
    (l) => l.trim() !== '' && !l.trimStart().startsWith('#') && !/^\s/.test(l),
  );

  assert.ok(regles.length <= 100, `${regles.length} règles déclarées, 100 au maximum.`);
  for (const ligne of lignes) {
    assert.ok(ligne.length <= 2000, `Ligne de ${ligne.length} caractères, 2 000 au maximum.`);
  }
});

test('le Worker envoie exactement les en-têtes que `_headers` déclare pour les pages', async () => {
  const attendus = litRegleFourreTout();
  const reponse = await app.request('http://localhost/api/profile');

  assert.equal(reponse.status, 200);

  for (const [nom, valeur] of attendus) {
    assert.equal(
      reponse.headers.get(nom),
      valeur,
      `« ${nom} » diverge entre _headers et le middleware du Worker.`,
    );
  }
});

test("les en-têtes de sécurité couvrent aussi les erreurs de l'API", async () => {
  // Le filet `notFound` renvoie du JSON : s'il échappait au middleware, une réponse d'erreur
  // serait servie sans `nosniff` ni CSP.
  const reponse = await app.request('http://localhost/api/inexistante');

  assert.equal(reponse.status, 404);
  assert.equal(reponse.headers.get('x-content-type-options'), 'nosniff');
  assert.ok(reponse.headers.get('content-security-policy-report-only'));
});

test("la CSP reste en Report-Only : aucune en-tête de CSP appliquée n'est envoyée", async () => {
  // Le passage en mode appliqué est une décision de Phase 1, pas un effet de bord.
  const reponse = await app.request('http://localhost/api/profile');

  assert.equal(reponse.headers.get('content-security-policy'), null);
  assert.ok(
    reponse.headers.get('content-security-policy-report-only')?.includes("default-src 'self'"),
  );
});

test("Strict-Transport-Security n'est pas posé en Phase 0", async () => {
  // C'est le seul en-tête dont l'effet survive au retrait : le navigateur le mémorise.
  // À poser en Phase 1, une fois le nom de domaine définitif arrêté.
  const reponse = await app.request('http://localhost/api/profile');

  assert.equal(reponse.headers.get('strict-transport-security'), null);
  assert.equal(litRegleFourreTout().has('strict-transport-security'), false);
});

test("les défauts de Hono posés en plus sur l'API sont inventoriés, pas subis", async () => {
  // `secureHeaders()` pose douze en-têtes par défaut. Sept ne sont pas déclarés dans `_headers` :
  // ils ne couvrent donc que l'API. Trois sont inertes sur une réponse JSON
  // (`Cross-Origin-Opener-Policy` et `Origin-Agent-Cluster` ne valent que pour un document de
  // premier niveau, `X-Download-Options` pour un téléchargement) ; les autres sont utiles ici —
  // `Cross-Origin-Resource-Policy` empêche un autre site d'embarquer ce JSON en sous-ressource.
  //
  // Les étendre aux pages demande de les observer en conditions réelles, donc après un
  // déploiement : point ouvert de Phase 1. Entre-temps, ce test fige la liste — une montée de
  // version de Hono qui changerait ses défauts échoue ici, et non en production.
  const reponse = await app.request('http://localhost/api/profile');
  const enPlus = [...reponse.headers].filter(([nom]) => !ENTETES_DU_CONTRAT.has(nom));

  assert.deepEqual(Object.fromEntries(enPlus.sort()), {
    'cache-control': 'public, max-age=300',
    'content-type': 'application/json',
    'cross-origin-opener-policy': 'same-origin',
    'cross-origin-resource-policy': 'same-origin',
    'origin-agent-cluster': '?1',
    'x-dns-prefetch-control': 'off',
    'x-download-options': 'noopen',
    'x-permitted-cross-domain-policies': 'none',
    'x-xss-protection': '0',
  });
});

test('`GET /api/profile` rend toujours le profil versionné, en-têtes mis à part', async () => {
  // Non-régression du lot : le middleware ne touche ni le corps, ni le Cache-Control.
  const reponse = await app.request('http://localhost/api/profile');
  const attendu = JSON.parse(
    readFileSync(resolve(racine, 'modules/profile/contract/src/data/profile.fr.json'), 'utf8'),
  );

  assert.equal(reponse.headers.get('cache-control'), 'public, max-age=300');
  assert.deepEqual(await reponse.json(), attendu);
});
