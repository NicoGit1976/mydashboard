// Connector registry — the framework. Adding a data source = adding an entry
// here. OAuth flow + Sources UI are all driven by this config.
export type AuthType = "oauth" | "token";
export type Difficulty = "easy" | "medium" | "hard";

export type TokenField = {
  name: string;
  label: string;
  placeholder?: string;
  type?: "text" | "password";
  multiline?: boolean;
  help?: string;
};

export type ConnectorDef = {
  key: string;
  label: string;
  color: string;
  authType: AuthType;
  difficulty: Difficulty;
  description: string;
  oauth?: {
    authUrl: string;
    tokenUrl: string;
    scopes: string[];
    clientIdEnv: string;
    clientSecretEnv: string;
    extraAuthParams?: Record<string, string>;
  };
  tokenFields?: TokenField[];
  // What a pasted credential IS, so connection-tokens knows how to turn it into
  // a bearer token. Absent = a plain access token used as-is.
  credType?: "token" | "service_account";
  // Shown above the paste form. Where to get the credential, in plain French.
  pasteHelp?: string;
  // Numbered, clickable steps — nobody should have to hunt through a provider's
  // console to find the one page that matters.
  pasteSteps?: { label: string; url?: string }[];
  // Set when the provider CANNOT be connected without a reviewed app. Renders
  // as an honest "unavailable" state instead of a button that leads nowhere.
  appOnly?: string;
};

export const CONNECTORS: ConnectorDef[] = [
  {
    key: "matomo",
    label: "Matomo",
    color: "#3450A1",
    authType: "token",
    difficulty: "easy",
    description: "Analytics web — ton instance Matomo, via un jeton d'API.",
    tokenFields: [
      { name: "url", label: "URL de l'instance", placeholder: "https://matomo.d-analytica.cloud" },
      { name: "token", label: "Jeton d'API (token_auth)", type: "password" },
    ],
  },
  {
    key: "ga4",
    label: "Google Analytics (GA4)",
    color: "#E8710A",
    authType: "oauth",
    difficulty: "easy",
    description: "Audience & trafic web via l'API GA4 Data.",
    credType: "service_account",
    pasteHelp:
      "Un compte de service Google : aucune app OAuth à créer, aucune expiration. " +
      "La même clé servira aussi à Search Console.",
    pasteSteps: [
      {
        label: "Activer l'API Analytics Data (bouton « Activer »)",
        url: "https://console.cloud.google.com/apis/library/analyticsdata.googleapis.com",
      },
      {
        label: "Créer un compte de service, puis onglet Clés > Ajouter une clé > JSON",
        url: "https://console.cloud.google.com/iam-admin/serviceaccounts",
      },
      { label: "Ouvrir le fichier téléchargé, tout copier, coller ci-dessous" },
      {
        label: "Dans GA4 : Admin > Gestion des accès > ajouter l'adresse du compte de service en Lecteur",
        url: "https://analytics.google.com/analytics/web/",
      },
    ],
    tokenFields: [
      {
        name: "token",
        label: "Contenu du fichier JSON",
        type: "password",
        multiline: true,
        placeholder: '{ "type": "service_account", "project_id": …',
        help: "Colle le fichier ENTIER — j'en extrais ce qu'il faut.",
      },
    ],
    oauth: {
      authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
      clientIdEnv: "GOOGLE_CLIENT_ID",
      clientSecretEnv: "GOOGLE_CLIENT_SECRET",
      extraAuthParams: { access_type: "offline", prompt: "consent" },
    },
  },
  {
    key: "gsc",
    label: "Google Search Console",
    color: "#4285F4",
    authType: "token",
    difficulty: "easy",
    description: "Requêtes, clics, impressions et position moyenne dans Google.",
    credType: "service_account",
    pasteHelp: "Le MÊME fichier JSON que pour GA4 — colle-le tel quel.",
    pasteSteps: [
      {
        label: "Activer l'API Search Console (bouton « Activer »)",
        url: "https://console.cloud.google.com/apis/library/searchconsole.googleapis.com",
      },
      { label: "Coller le même fichier JSON que pour GA4" },
      {
        label: "Ajouter l'adresse du compte de service comme utilisateur de la propriété",
        url: "https://search.google.com/search-console/users",
      },
    ],
    tokenFields: [
      {
        name: "token",
        label: "Contenu du fichier JSON",
        type: "password",
        multiline: true,
        placeholder: '{ "type": "service_account", "project_id": …',
        help: "Le même fichier que GA4.",
      },
    ],
  },
  {
    key: "meta",
    label: "Facebook + Instagram",
    color: "#1877F2",
    authType: "oauth",
    difficulty: "medium",
    description: "Pages Facebook & comptes Instagram Pro (Meta Graph API).",
    oauth: {
      authUrl: "https://www.facebook.com/v21.0/dialog/oauth",
      tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
      // Read AND write: without pages_manage_posts / instagram_content_publish
      // every publish fails with a "missing permission" that blames the user.
      scopes: [
        "pages_show_list",
        "pages_read_engagement",
        "read_insights",
        "instagram_basic",
        "instagram_manage_insights",
        "pages_manage_posts",
        "instagram_content_publish",
      ],
      clientIdEnv: "META_CLIENT_ID",
      clientSecretEnv: "META_CLIENT_SECRET",
    },
    credType: "token",
    pasteHelp:
      "Sans app OAuth. Permissions à cocher : pages_show_list, pages_read_engagement, " +
      "pages_manage_posts, instagram_basic, instagram_content_publish.",
    pasteSteps: [
      {
        label: "Graph API Explorer : choisir l'app, cocher les permissions, « Generate Access Token »",
        url: "https://developers.facebook.com/tools/explorer/",
      },
      {
        label: "Pas encore d'app ? En créer une (gratuit, immédiat, type « Entreprise »)",
        url: "https://developers.facebook.com/apps/",
      },
      {
        label: "Rendre le jeton longue durée : coller > Debug > « Extend Access Token » (~60 j)",
        url: "https://developers.facebook.com/tools/debug/accesstoken/",
      },
    ],
    tokenFields: [
      {
        name: "token",
        label: "Jeton d'accès Meta",
        type: "password",
        multiline: true,
        help: "Jeton utilisateur longue durée — il donne accès à tes Pages et comptes Instagram Pro.",
      },
    ],
  },
  {
    key: "gmb",
    label: "Google Business Profile",
    color: "#34A853",
    authType: "oauth",
    difficulty: "hard",
    description: "Fiche Google (vues, recherches, actions). Accès API à demander à Google.",
    oauth: {
      authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      scopes: ["https://www.googleapis.com/auth/business.manage"],
      clientIdEnv: "GOOGLE_CLIENT_ID",
      clientSecretEnv: "GOOGLE_CLIENT_SECRET",
      extraAuthParams: { access_type: "offline", prompt: "consent" },
    },
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    color: "#0A66C2",
    authType: "oauth",
    difficulty: "hard",
    description: "Publication sur ton profil + statistiques de Page entreprise.",
    oauth: {
      authUrl: "https://www.linkedin.com/oauth/v2/authorization",
      tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
      // w_member_social (personal posting) is self-serve. openid/profile give
      // the member id we need as the post author. The r_/rw_organization_*
      // scopes still require LinkedIn approval and only affect page stats.
      scopes: ["openid", "profile", "w_member_social"],
      clientIdEnv: "LINKEDIN_CLIENT_ID",
      clientSecretEnv: "LINKEDIN_CLIENT_SECRET",
    },
    credType: "token",
    pasteHelp:
      "Sans app OAuth. Ton identité LinkedIn est récupérée automatiquement à l'enregistrement.",
    pasteSteps: [
      {
        label: "Ton app > onglet Auth > « Token Generator » : cocher openid, profile, w_member_social",
        url: "https://www.linkedin.com/developers/apps",
      },
      { label: "Générer le jeton et le coller ci-dessous" },
    ],
    tokenFields: [
      {
        name: "token",
        label: "Jeton d'accès LinkedIn",
        type: "password",
        multiline: true,
        help: "Jeton membre (w_member_social) — publie sur TON profil.",
      },
    ],
  },
];

export function getConnector(key: string): ConnectorDef | undefined {
  return CONNECTORS.find((c) => c.key === key);
}

// A provider is "configurable" when its credentials are present in the env.
// Token providers need no app registration, so they're always available.
export function isConfigured(c: ConnectorDef): boolean {
  if (c.authType === "token") return true;
  if (!c.oauth) return false;
  return Boolean(process.env[c.oauth.clientIdEnv] && process.env[c.oauth.clientSecretEnv]);
}
