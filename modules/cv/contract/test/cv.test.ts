/**
 * Le CV est le seul contenu du site : s'il est cassé, il n'y a rien à afficher. Ces tests sont
 * donc autant une suite unitaire qu'un contrôle de contenu, et la CI les passe avant de déployer.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { lireCv, valideCv } from '../src/index.js';

test('le CV versionné dans le dépôt est valide', () => {
  const resultat = lireCv();
  // En cas d'échec, on veut lire *quelles* règles ont sauté, pas un simple « false ».
  assert.ok(resultat.ok, `CV invalide :\n${resultat.ok ? '' : resultat.erreurs.join('\n')}`);
});

test('les expériences sont rangées de la plus récente à la plus ancienne', () => {
  const resultat = lireCv();
  assert.ok(resultat.ok);

  // « MM/AAAA » ne se trie pas comme du texte : on repasse en « AAAAMM ».
  const rang = (date: string): number => {
    const [mois, annee] = date.split('/');
    return Number(`${annee}${mois}`);
  };

  const débuts = resultat.cv.experiences.map((e) => rang(e.debut));
  const triés = [...débuts].sort((a, b) => b - a);
  assert.deepEqual(
    débuts,
    triés,
    "L'ordre d'affichage vient du fichier : il doit être antéchronologique.",
  );
});

test('un objet vide est rejeté, et chaque section manquante est signalée', () => {
  const resultat = valideCv({});
  assert.equal(resultat.ok, false);
  assert.ok(!resultat.ok && resultat.erreurs.length > 0);

  const messages = (resultat as { erreurs: readonly string[] }).erreurs.join('\n');
  for (const section of ['profil', 'experiences', 'formations', 'competences', 'langues']) {
    assert.match(
      messages,
      new RegExp(section),
      `« ${section} » aurait dû être signalée manquante.`,
    );
  }
});

test("une valeur qui n'est pas un objet est rejetée sans lever d'exception", () => {
  for (const valeur of [null, undefined, 42, 'texte', []]) {
    const resultat = valideCv(valeur);
    assert.equal(
      resultat.ok,
      false,
      `${JSON.stringify(valeur) ?? 'undefined'} aurait dû être rejeté.`,
    );
  }
});

test('une date au mauvais format est rejetée', () => {
  const resultat = valideCv({
    ...squelette(),
    experiences: [{ debut: '2019-03', fin: '06/2019', poste: 'Développeur', entreprise: 'CTG' }],
  });
  assert.equal(resultat.ok, false);
  assert.match(
    (resultat as { erreurs: readonly string[] }).erreurs.join('\n'),
    /experiences\[0\]\.debut/,
  );
});

test("« aujourd'hui » est accepté comme date de fin d'un poste en cours", () => {
  const resultat = valideCv({
    ...squelette(),
    experiences: [
      { debut: '02/2020', fin: "aujourd'hui", poste: 'Développeur', entreprise: 'CTG' },
    ],
  });
  assert.ok(resultat.ok, resultat.ok ? '' : (resultat.erreurs as string[]).join('\n'));
});

test("un lien qui n'est pas en https est rejeté", () => {
  const base = squelette();
  const resultat = valideCv({
    ...base,
    profil: { ...base.profil, liens: [{ libelle: 'GitHub', url: 'github.com/nseng-dev' }] },
  });
  assert.equal(resultat.ok, false);
  assert.match(
    (resultat as { erreurs: readonly string[] }).erreurs.join('\n'),
    /profil\.liens\[0\]\.url/,
  );
});

/** Un CV minimal valide, que chaque test déforme sur un seul point. */
function squelette() {
  return {
    profil: {
      nom: 'Nathan SENG',
      titre: 'Développeur',
      accroche: 'Une phrase.',
      localisation: 'Épinal',
      liens: [],
    },
    experiences: [{ debut: '02/2020', fin: '07/2021', poste: 'Développeur', entreprise: 'CTG' }],
    formations: [{ debut: '2018', fin: '2019', intitule: 'LP AIMO', etablissement: 'IUT' }],
    competences: [{ libelle: 'Outils', items: ['Angular'] }],
    langues: [{ langue: 'Français', niveau: 'Courant' }],
    interets: [{ libelle: 'Sport', details: 'VTT' }],
    misAJour: '2021-09',
  };
}
