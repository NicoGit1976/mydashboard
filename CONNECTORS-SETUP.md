# Brancher les sources de données (GA4 · Facebook/Instagram · LinkedIn)

Ce guide explique **ce que tu dois créer côté Google / Meta / LinkedIn** pour que
MyDashboard récupère tes vraies données. Le code des connecteurs est **déjà prêt** —
il ne manque que les identifiants d'application (OAuth) que seules ces plateformes
peuvent te délivrer.

## Comment ça marche (important)

- On **ne saisit jamais de mot de passe** de réseau social. On utilise **OAuth** :
  tu cliques « Connecter », tu autorises sur le site officiel (Google, Facebook…),
  et MyDashboard reçoit un **jeton** chiffré. C'est la même mécanique que DashThis.
- Pour qu'OAuth fonctionne, chaque plateforme a besoin d'une **URL de redirection**
  qui pointe vers l'app **en ligne**. Donc l'ordre est :

  **1. Déployer l'app** (→ `https://tools.d-analytica.cloud`) → **2. Créer les apps OAuth**
  ci-dessous → **3. Connecter + attribuer une source à chaque client** → **4. Données réelles**.

- Les identifiants se rangent dans des **variables d'environnement** (jamais dans le
  code). Tu me donnes les valeurs, je les injecte au déploiement — ou tu les colles
  dans le `.env` du VPS.

| Variable | Pour |
|---|---|
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | GA4 **et** Google Business Profile |
| `META_CLIENT_ID` / `META_CLIENT_SECRET` | Facebook + Instagram |
| `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` | LinkedIn |

---

## 1) Google Analytics (GA4) — ⭐ le plus simple, OK aujourd'hui

1. **Google Cloud Console** → crée un projet (ex. « MyDashboard »).
2. **APIs & Services → Library** → active **Google Analytics Data API** *et*
   **Google Analytics Admin API**.
3. **APIs & Services → OAuth consent screen** :
   - User type **External**, laisse l'app en mode **Testing**.
   - **Test users** → ajoute ton adresse Google (celle qui a accès aux GA4).
   - Scope : `…/auth/analytics.readonly` (déjà demandé par l'app).
   - En mode *Testing*, **aucune validation Google n'est nécessaire** pour tes propres comptes.
4. **APIs & Services → Credentials → Create credentials → OAuth client ID** :
   - Type **Web application**.
   - **Authorized redirect URI** :
     `https://tools.d-analytica.cloud/api/connect/ga4/callback`
   - (Optionnel, pour tester en local : ajoute aussi `http://localhost:4310/api/connect/ga4/callback`)
5. Copie le **Client ID** + **Client secret** → `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.

➡️ Ensuite : page **Sources** → *Connecter GA4* → puis dans chaque client (**Réglages →
Sources**), choisis la **propriété GA4** dans la liste déroulante.

---

## 2) Facebook + Instagram (Meta) — 🟠 OK aujourd'hui pour TES pages

1. **developers.facebook.com → My Apps → Create App** → type **Business**.
2. Ajoute le produit **Facebook Login** → Settings :
   - **Valid OAuth Redirect URIs** :
     `https://tools.d-analytica.cloud/api/connect/meta/callback`
3. **App roles** → ajoute-toi comme **Admin/Developer** : en **mode Développement**,
   tu peux lire les insights de **tes propres** Pages **sans App Review**.
4. Permissions utilisées (déjà demandées par l'app) : `pages_read_engagement`,
   `read_insights`, `instagram_basic`, `instagram_manage_insights`.
5. **Settings → Basic** : copie **App ID** + **App Secret** → `META_CLIENT_ID` / `META_CLIENT_SECRET`.

⚠️ **Instagram** : le compte doit être **Professionnel (Business/Creator)** et **relié à
une Page Facebook** (sinon pas d'insights IG).
⚠️ Pour lire les pages **d'autres personnes/clients**, Meta exige une **App Review**
(plus long). Pour tes comptes à toi : pas besoin.

---

## 3) LinkedIn — 🔴 le plus long, à lancer MAINTENANT

LinkedIn est le seul à demander une **validation préalable** : prévois du délai.

1. **linkedin.com/developers → Create app** → associe-le à une **Page entreprise**
   LinkedIn que tu administres.
2. Onglet **Products** → demande **Community Management API** (et **Sign In with LinkedIn**).
   → **C'est cette demande qui nécessite une approbation LinkedIn** (souvent quelques
   jours). Lance-la dès aujourd'hui.
3. Onglet **Auth** :
   - **Authorized redirect URL** :
     `https://tools.d-analytica.cloud/api/connect/linkedin/callback`
   - Scopes utilisés : `r_organization_social`, `rw_organization_admin`.
4. Copie **Client ID** + **Client Secret** → `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET`.

> Tant que l'API n'est pas approuvée, le connecteur LinkedIn affichera simplement les
> données de démo (aucune erreur, aucun blocage) — il basculera en réel automatiquement
> une fois l'accès accordé.

---

## Récapitulatif des URL de redirection (à coller tel quel)

```
https://tools.d-analytica.cloud/api/connect/ga4/callback
https://tools.d-analytica.cloud/api/connect/meta/callback
https://tools.d-analytica.cloud/api/connect/linkedin/callback
https://tools.d-analytica.cloud/api/connect/gmb/callback     (Google Business, plus tard)
```

## Et après ?

- **Page Sources** : un bouton « Connecter » par source (actif dès que ses identifiants
  sont présents).
- **Client → Réglages → Sources** : pour chaque source connectée, un **menu déroulant**
  liste tes propriétés / Pages / organisations → tu choisis celle du client.
- Le rapport remplace alors les chiffres de démo par les **vraies données** (28 derniers
  jours vs. 28 jours précédents), et le pied de rapport indique « Données en direct ».
- En cas d'erreur d'une source (token expiré, API non approuvée…), cette source **retombe
  proprement sur la démo** — le rapport ne casse jamais.
