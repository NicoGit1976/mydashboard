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
      "1. console.cloud.google.com > IAM > Comptes de service > créer > Clés > Ajouter une clé > JSON. " +
      "2. Ouvre le fichier téléchargé, copie TOUT son contenu, colle-le ci-dessous. " +
      "3. Dans GA4 : Admin > Gestion des accès > ajoute l'adresse du compte de service en Lecteur. " +
      "Aucune app OAuth à créer, aucune expiration.",
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
    pasteHelp:
      "Le MÊME fichier JSON que pour GA4 — colle-le tel quel. Ajoute ensuite l'adresse du " +
      "compte de service comme utilisateur de la propriété dans Search Console " +
      "(Paramètres > Utilisateurs et autorisations).",
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
      "Sans app OAuth : va sur developers.facebook.com/tools/explorer, choisis ton app " +
      "(ou crée-en une, c'est gratuit et immédiat), coche les permissions pages_show_list, " +
      "pages_read_engagement, pages_manage_posts, instagram_basic, instagram_content_publish, " +
      "génère le jeton et colle-le ici. Passe-le en « longue durée » via l'outil " +
      "Access Token Debugger pour qu'il dure ~60 jours.",
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
      "Sans app OAuth : developer.linkedin.com > ton app > onglet Auth > « Token Generator », " +
      "coche openid, profile et w_member_social, génère le jeton et colle-le ici. " +
      "Je récupère automatiquement ton identité LinkedIn à l'enregistrement.",
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
