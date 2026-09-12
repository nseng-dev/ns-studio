/**
 * Validation du profil.
 *
 * Le profil est aujourd'hui un fichier JSON versionné : le compilateur ne le relit pas, et une
 * virgule mal placée ne se verrait qu'à l'affichage — sur la seule page du site. Ce validateur
 * est donc le garde-fou, et la CI le passe avant chaque déploiement.
 *
 * Il resservira tel quel le jour où le contenu viendra d'une base ou d'un formulaire
 * d'administration : c'est le même contrat qu'il faudra vérifier, à une autre frontière.
 */

import type {
  Profile,
  Experience,
  Formation,
  GroupeCompetences,
  Interet,
  Langue,
  Lien,
  Profil,
} from './contract.js';

export type Resultat =
  | { readonly ok: true; readonly profile: Profile }
  | { readonly ok: false; readonly erreurs: readonly string[] };

/** Accumulateur d'erreurs : on les collecte toutes plutôt que d'échouer à la première. */
class Contrôle {
  readonly erreurs: string[] = [];

  objet(valeur: unknown, chemin: string): valeur is Record<string, unknown> {
    if (typeof valeur !== 'object' || valeur === null || Array.isArray(valeur)) {
      this.erreurs.push(`${chemin} : objet attendu.`);
      return false;
    }
    return true;
  }

  /** Chaîne obligatoire et non vide — une chaîne vide n'affiche rien, c'est donc une erreur. */
  texte(valeur: unknown, chemin: string): void {
    if (typeof valeur !== 'string' || valeur.trim() === '') {
      this.erreurs.push(`${chemin} : texte non vide attendu.`);
    }
  }

  texteFacultatif(valeur: unknown, chemin: string): void {
    if (valeur !== undefined) this.texte(valeur, chemin);
  }

  /** Tableau obligatoire et non vide : une section vide ne se justifie pas sur un profil. */
  liste(valeur: unknown, chemin: string): valeur is unknown[] {
    if (!Array.isArray(valeur)) {
      this.erreurs.push(`${chemin} : tableau attendu.`);
      return false;
    }
    if (valeur.length === 0) this.erreurs.push(`${chemin} : au moins une entrée attendue.`);
    return true;
  }

  listeDeTextes(valeur: unknown, chemin: string): void {
    if (!this.liste(valeur, chemin)) return;
    valeur.forEach((item, i) => this.texte(item, `${chemin}[${i}]`));
  }

  /** Parcourt un tableau d'objets en déléguant le détail à `verifie`. */
  chaque(
    valeur: unknown,
    chemin: string,
    verifie: (entrée: Record<string, unknown>, chemin: string) => void,
  ): void {
    if (!this.liste(valeur, chemin)) return;
    valeur.forEach((entrée, i) => {
      const où = `${chemin}[${i}]`;
      if (this.objet(entrée, où)) verifie(entrée, où);
    });
  }
}

/** « MM/AAAA », ou « aujourd'hui » pour un poste en cours. */
const MOIS_ANNEE = /^(0[1-9]|1[0-2])\/[12]\d{3}$/;
/** « AAAA ». */
const ANNEE = /^[12]\d{3}$/;
/** « AAAA-MM ». */
const ANNEE_MOIS = /^[12]\d{3}-(0[1-9]|1[0-2])$/;

function date(c: Contrôle, valeur: unknown, chemin: string, motif: RegExp, exemple: string): void {
  if (typeof valeur !== 'string' || !motif.test(valeur)) {
    c.erreurs.push(
      `${chemin} : date au format « ${exemple} » attendue (reçu : ${JSON.stringify(valeur)}).`,
    );
  }
}

/**
 * Vérifie qu'une valeur inconnue est un profil exploitable.
 *
 * Ne renvoie jamais d'exception : l'appelant décide quoi faire de l'échec (503 côté API,
 * sortie non nulle côté CI).
 */
export function valideProfile(valeur: unknown): Resultat {
  const c = new Contrôle();

  if (!c.objet(valeur, 'profile')) return { ok: false, erreurs: c.erreurs };

  /* ---------------- profil ---------------- */
  if (c.objet(valeur['profil'], 'profil')) {
    const profil = valeur['profil'] as Partial<Profil>;
    c.texte(profil.nom, 'profil.nom');
    c.texte(profil.titre, 'profil.titre');
    c.texte(profil.accroche, 'profil.accroche');
    c.texte(profil.localisation, 'profil.localisation');
    c.texteFacultatif(profil.email, 'profil.email');
    c.texteFacultatif(profil.permis, 'profil.permis');
    // Les liens peuvent manquer, mais s'ils sont là ils doivent être exploitables.
    if (!Array.isArray(profil.liens)) {
      c.erreurs.push('profil.liens : tableau attendu (vide si aucun lien).');
    } else {
      profil.liens.forEach((lien: Lien, i) => {
        const où = `profil.liens[${i}]`;
        if (!c.objet(lien, où)) return;
        c.texte(lien.libelle, `${où}.libelle`);
        // Un lien qui ne commence pas par https:// serait interprété comme une route interne.
        if (typeof lien.url !== 'string' || !lien.url.startsWith('https://')) {
          c.erreurs.push(`${où}.url : URL https:// attendue.`);
        }
      });
    }
  }

  /* ---------------- expériences ---------------- */
  c.chaque(valeur['experiences'], 'experiences', (e, où) => {
    const exp = e as unknown as Partial<Experience>;
    date(c, exp.debut, `${où}.debut`, MOIS_ANNEE, '03/2019');
    if (exp.fin !== "aujourd'hui") date(c, exp.fin, `${où}.fin`, MOIS_ANNEE, '06/2019');
    c.texte(exp.poste, `${où}.poste`);
    c.texte(exp.entreprise, `${où}.entreprise`);
    c.texteFacultatif(exp.lieu, `${où}.lieu`);
    if (exp.details !== undefined) c.listeDeTextes(exp.details, `${où}.details`);
    if (exp.technologies !== undefined) c.listeDeTextes(exp.technologies, `${où}.technologies`);
  });

  /* ---------------- formations ---------------- */
  c.chaque(valeur['formations'], 'formations', (f, où) => {
    const form = f as unknown as Partial<Formation>;
    date(c, form.debut, `${où}.debut`, ANNEE, '2018');
    date(c, form.fin, `${où}.fin`, ANNEE, '2019');
    c.texte(form.intitule, `${où}.intitule`);
    c.texteFacultatif(form.precision, `${où}.precision`);
    c.texte(form.etablissement, `${où}.etablissement`);
  });

  /* ---------------- compétences, langues, intérêts ---------------- */
  c.chaque(valeur['competences'], 'competences', (g, où) => {
    const groupe = g as unknown as Partial<GroupeCompetences>;
    c.texte(groupe.libelle, `${où}.libelle`);
    c.listeDeTextes(groupe.items, `${où}.items`);
  });

  c.chaque(valeur['langues'], 'langues', (l, où) => {
    const langue = l as unknown as Partial<Langue>;
    c.texte(langue.langue, `${où}.langue`);
    c.texte(langue.niveau, `${où}.niveau`);
  });

  c.chaque(valeur['interets'], 'interets', (i, où) => {
    const interet = i as unknown as Partial<Interet>;
    c.texte(interet.libelle, `${où}.libelle`);
    c.texte(interet.details, `${où}.details`);
  });

  date(c, valeur['misAJour'], 'misAJour', ANNEE_MOIS, '2026-09');

  return c.erreurs.length === 0
    ? { ok: true, profile: valeur as unknown as Profile }
    : { ok: false, erreurs: c.erreurs };
}
