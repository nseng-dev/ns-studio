/**
 * La forme d'un CV.
 *
 * Ce fichier est la seule description du CV dans toute la plateforme. L'API Hono le sert,
 * l'interface Angular le consomme : aucune des deux ne peut dériver sans que le compilateur
 * s'en aperçoive.
 *
 * Les dates restent des chaînes « MM/AAAA » plutôt que des `Date` : elles ne sont jamais
 * calculées, seulement affichées, et un `Date` traverserait mal le JSON.
 */

/** Un lien externe affiché dans l'en-tête (GitHub, LinkedIn…). */
export interface Lien {
  readonly libelle: string;
  readonly url: string;
}

/**
 * L'en-tête du CV.
 *
 * Tout ce qui identifie physiquement une personne — adresse postale, téléphone, date de
 * naissance, état civil, nationalité — est **volontairement absent**. La page est publique et
 * le dépôt l'est aussi : ces informations seraient indexées et moissonnées. En France elles
 * sont de toute façon déconseillées sur un CV, car elles ouvrent la porte à la discrimination.
 */
export interface Profil {
  readonly nom: string;
  readonly titre: string;
  /** La phrase d'accroche, entre guillemets sur le CV papier. */
  readonly accroche: string;
  /** Zone géographique, pas l'adresse : « Épinal, Vosges » et non le numéro de rue. */
  readonly localisation: string;
  readonly email?: string;
  readonly permis?: string;
  readonly liens: readonly Lien[];
}

export interface Experience {
  /** « MM/AAAA ». */
  readonly debut: string;
  /** « MM/AAAA », ou « aujourd'hui » pour un poste en cours. */
  readonly fin: string;
  readonly poste: string;
  readonly entreprise: string;
  readonly lieu?: string;
  /**
   * Ce qui a été fait, une entrée par puce affichée.
   *
   * Facultatif : les postes les plus anciens du CV papier n'en portent aucun, et un intitulé
   * seul se suffit. Mieux vaut une ligne sobre qu'un détail inventé.
   */
  readonly details?: readonly string[];
  /** Facultatif : les technologies du poste, affichées en étiquettes. */
  readonly technologies?: readonly string[];
}

export interface Formation {
  /** « AAAA ». */
  readonly debut: string;
  readonly fin: string;
  readonly intitule: string;
  /** Le développé d'un sigle, affiché en plus discret. */
  readonly precision?: string;
  readonly etablissement: string;
}

/** Un bloc de compétences : un titre, une liste. */
export interface GroupeCompetences {
  readonly libelle: string;
  readonly items: readonly string[];
}

export interface Langue {
  readonly langue: string;
  readonly niveau: string;
}

export interface Interet {
  readonly libelle: string;
  readonly details: string;
}

/** Le CV complet — exactement le corps de `GET /api/cv`. */
export interface Cv {
  readonly profil: Profil;
  readonly experiences: readonly Experience[];
  readonly formations: readonly Formation[];
  readonly competences: readonly GroupeCompetences[];
  readonly langues: readonly Langue[];
  readonly interets: readonly Interet[];
  /** Date « AAAA-MM » de la dernière mise à jour du contenu, affichée en pied de page. */
  readonly misAJour: string;
}

/** Corps d'erreur uniforme de l'API. Un seul code aujourd'hui, la porte reste ouverte. */
export interface ErreurApi {
  readonly code: 'CV_INVALIDE';
  readonly message: string;
  readonly erreurs?: readonly string[];
}
