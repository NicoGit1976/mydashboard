// Connector registry — the framework. Adding a data source = adding an entry
// here. OAuth flow + Sources UI are all driven by this config.
export type AuthType = "oauth" | "token";
export type Difficulty = "easy" | "medium" | "hard";

export type TokenField = {
  name: string;
  label: string;
  placeholder?: string;
  type?: "text" | "password";
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
    key: "meta",
    label: "Facebook + Instagram",
    color: "#1877F2",
    authType: "oauth",
    difficulty: "medium",
    description: "Pages Facebook & comptes Instagram Pro (Meta Graph API).",
    oauth: {
      authUrl: "https://www.facebook.com/v21.0/dialog/oauth",
      tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
      scopes: ["pages_read_engagement", "read_insights", "instagram_basic", "instagram_manage_insights"],
      clientIdEnv: "META_CLIENT_ID",
      clientSecretEnv: "META_CLIENT_SECRET",
    },
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
    description: "Statistiques de Page entreprise (Community Management API).",
    oauth: {
      authUrl: "https://www.linkedin.com/oauth/v2/authorization",
      tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
      scopes: ["r_organization_social", "rw_organization_admin"],
      clientIdEnv: "LINKEDIN_CLIENT_ID",
      clientSecretEnv: "LINKEDIN_CLIENT_SECRET",
    },
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
