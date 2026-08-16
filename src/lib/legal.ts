// Identity of the service, shown on the public legal pages.
//
// These four fields are the only ones that cannot be read from the code, and
// every one of them is required before the privacy-policy URL is submitted to
// LinkedIn, Meta or Google: their reviewers check that a real, reachable entity
// stands behind the application. A field left empty is simply not rendered —
// the published page never shows a blank or a placeholder.
export const PUBLISHER = {
  name: "Blue Oktopus",
  /** Forme juridique et capital, ex. « SUARL au capital de 1 000 000 FCFA ». */
  legalForm: "",
  /** Numéro d'immatriculation (RCCM) et NINEA. */
  registration: "",
  /** Siège social complet. */
  address: "",
  city: "Dakar",
  country: "Sénégal",
  /** Adresse de contact pour toute demande relative aux données. */
  email: "",
  /** Directeur de la publication. */
  director: "Nicolas Geslain",
  site: "https://www.blueoktopus.expert",
};

export const APP = {
  name: "MyDashboard",
  url: "https://tools.d-analytica.cloud",
};

export const HOST = {
  name: "Hostinger International Ltd.",
  address: "Švitrigailos str. 34, LT-03230 Vilnius, Lituanie",
  /** Serveur virtuel dédié, localisé dans l'Union européenne. */
  region: "Union européenne",
};

// Date of the version in force. Bump it whenever the text below changes —
// a policy that never changes date is a policy nobody maintains.
export const LEGAL_UPDATED = "16 août 2026";
