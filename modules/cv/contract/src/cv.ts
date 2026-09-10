/**
 * L'accès au contenu du CV.
 *
 * **C'est la charnière de tout le module.** Aujourd'hui le CV est un fichier JSON versionné :
 * l'éditer est une pull request, et rien d'autre n'est nécessaire. Le jour où il viendra d'une
 * base (D1) ou d'un formulaire d'administration, c'est cette fonction qui changera — et elle
 * seule. Ni l'API Hono, ni l'interface Angular n'ont à le savoir.
 *
 * L'attribut `with { type: 'json' }` n'est pas décoratif : sans lui, Node refuse l'import en
 * ESM, et les tests comme la CI tournent en Node.
 */

import donnees from './data/cv.fr.json' with { type: 'json' };
import { valideCv, type Resultat } from './valide.js';

/** Le résultat est mis en cache : le JSON ne change pas d'une requête à l'autre. */
let memo: Resultat | undefined;

/**
 * Lit le CV, validé.
 *
 * Renvoie un `Resultat` plutôt que de lever une exception : c'est à l'appelant de décider —
 * l'API répond 500, la CI sort en erreur, un futur back-office afficherait les messages.
 */
export function lireCv(): Resultat {
  return (memo ??= valideCv(donnees));
}
