import type { Metadata } from "next";
import LegalShell, { LegalSection } from "@/components/legal/LegalShell";
import { APP, HOST, PUBLISHER } from "@/lib/legal";

// Public privacy policy. Reachable without a session: it is the URL declared to
// LinkedIn, Meta and Google when their APIs are requested, and their reviewers
// read it before granting access.

export const metadata: Metadata = {
  title: `Politique de confidentialité — ${APP.name}`,
  description:
    "Données traitées par MyDashboard, durées de conservation, sous-traitants et droits des personnes.",
  robots: { index: true, follow: true },
};

const UL = "list-disc space-y-1.5 pl-5";

export default function PrivacyPage() {
  return (
    <LegalShell
      title="Politique de confidentialité"
      intro={`${APP.name} est un outil de reporting marketing. Il rassemble, pour chaque client d'une agence, les statistiques publiées par les plateformes auxquelles cette agence a accès, et les met en forme dans un rapport. Cette page décrit exactement quelles données transitent par le service, pourquoi, et pendant combien de temps.`}
    >
      <LegalSection title="En résumé">
        <ul className={UL}>
          <li>
            Nous traitons des <strong>statistiques agrégées</strong>{" "}(nombres de
            visites, de clics, d&apos;impressions), pas des profils de personnes.
          </li>
          <li>
            Nous ne vendons aucune donnée, nous n&apos;en louons aucune et nous ne
            faisons ni publicité ciblée ni revente à des courtiers.
          </li>
          <li>
            Les autorisations d&apos;accès aux plateformes sont{" "}
            <strong>chiffrées</strong>{" "}et ne sont jamais affichées, même à leur
            propriétaire.
          </li>
          <li>
            Les liens de suivi comptent des clics <strong>sans conserver
            d&apos;adresse IP</strong>{" "}ni d&apos;identifiant de navigateur.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Qui est responsable du service">
        <p>
          {APP.name} est édité et hébergé par {PUBLISHER.name}
          {PUBLISHER.legalForm ? `, ${PUBLISHER.legalForm}` : ""}, dont le siège
          est à {PUBLISHER.city}, {PUBLISHER.country}. Le service est accessible
          à l&apos;adresse {APP.url}.
        </p>
        <p>
          Deux responsabilités se distinguent. {PUBLISHER.name} est responsable
          du traitement pour les <strong>comptes utilisateurs</strong>{" "}du
          service. Pour les <strong>données des clients finaux</strong>{" "}(les
          statistiques d&apos;un site ou d&apos;une page), l&apos;utilisateur —
          l&apos;agence ou le consultant qui connecte ses accès — reste
          responsable du traitement&nbsp;; {PUBLISHER.name}{" "}agit comme
          sous-traitant et n&apos;utilise ces données pour aucune finalité
          propre.
        </p>
      </LegalSection>

      <LegalSection title="Données traitées">
        <p>
          <strong>Compte utilisateur.</strong>{" "}Identifiant de connexion, nom,
          adresse e-mail lorsqu&apos;elle est renseignée, mot de passe conservé
          sous forme de condensat (jamais en clair), rôle, nom et logo de
          l&apos;agence affichés en pied de rapport.
        </p>
        <p>
          <strong>Autorisations d&apos;accès aux plateformes.</strong>{" "}Lorsque
          vous connectez un compte Google, Meta, LinkedIn ou Matomo, le service
          conserve le jeton délivré par la plateforme, chiffré au repos, ainsi
          que le libellé du compte concerné et la date d&apos;expiration. Ces
          jetons servent uniquement à interroger les statistiques que vous avez
          autorisées. Ils ne sont jamais affichés dans l&apos;interface, jamais
          transmis à un tiers, et une déconnexion les efface.
        </p>
        <p>
          <strong>Statistiques rapatriées.</strong>{" "}Volumes de visites, de
          sessions, de clics et d&apos;impressions, chemins des pages les plus
          consultées, requêtes de recherche ayant mené au site, mesures
          d&apos;audience et d&apos;engagement des pages sociales. Ces données
          sont fournies déjà agrégées par les plateformes&nbsp;: elles ne
          permettent pas d&apos;identifier un visiteur.
        </p>
        <p>
          <strong>Liens de suivi.</strong>{" "}Le service peut raccourcir un lien
          pour mesurer les clics d&apos;une publication. Le compteur est tenu
          par jour et par lien. Aucune ligne de clic individuelle, aucune adresse
          IP et aucun agent utilisateur ne sont conservés&nbsp;: pour distinguer
          un visiteur récurrent d&apos;un nouveau, le service utilise un
          condensat salé qui change chaque jour, ce qui rend deux journées
          impossibles à relier entre elles.
        </p>
        <p>
          <strong>Fichiers déposés.</strong>{" "}Logos et visuels que vous chargez
          pour vos rapports et vos publications, conservés sur le serveur du
          service.
        </p>
      </LegalSection>

      <LegalSection title="Données issues de LinkedIn">
        <p>
          Lorsque vous connectez LinkedIn, le service accède, avec votre
          autorisation explicite et dans la limite des permissions que vous
          accordez&nbsp;:
        </p>
        <ul className={UL}>
          <li>
            à votre <strong>identité de membre</strong>{" "}(nom, photo, identifiant
            technique), afin d&apos;afficher quel compte est connecté&nbsp;;
          </li>
          <li>
            à la <strong>liste des pages d&apos;organisation</strong>{" "}que vous
            administrez, afin que vous puissiez choisir celles à suivre&nbsp;;
          </li>
          <li>
            aux <strong>statistiques agrégées</strong>{" "}de ces pages et de leurs
            publications (abonnés, impressions, engagement).
          </li>
        </ul>
        <p>
          Ces données sont utilisées dans un seul but&nbsp;: constituer le
          rapport destiné à vous et au client concerné. Elles ne sont pas
          revendues, pas partagées avec des tiers, pas utilisées pour de la
          publicité ni pour entraîner un modèle d&apos;apprentissage. Elles sont
          effacées lorsque vous déconnectez LinkedIn ou supprimez le client
          associé. Vous pouvez également révoquer l&apos;accès à tout moment
          depuis les paramètres de votre compte LinkedIn&nbsp;; le service perd
          alors immédiatement toute possibilité de lecture.
        </p>
      </LegalSection>

      <LegalSection title="Données issues de Google, Meta et Matomo">
        <p>
          Le principe est le même pour les autres plateformes. Google Analytics
          et Google Search Console fournissent des mesures d&apos;audience et de
          référencement&nbsp;; Meta fournit les statistiques des pages Facebook
          et des comptes Instagram professionnels&nbsp;; Matomo fournit les
          mesures d&apos;audience du site. Dans tous les cas, seules des données
          agrégées sont demandées, uniquement pour les comptes que vous avez
          rattachés à un client.
        </p>
      </LegalSection>

      <LegalSection title="Analyse assistée par intelligence artificielle">
        <p>
          Le service peut rédiger un commentaire d&apos;analyse à partir des
          chiffres d&apos;un rapport. Cette fonction ne se déclenche jamais
          seule&nbsp;: elle demande une action explicite de l&apos;utilisateur, et
          reste totalement inactive tant qu&apos;aucune clé d&apos;API n&apos;est
          configurée sur le serveur.
        </p>
        <p>
          Quand elle est utilisée, une fiche de chiffres est transmise à{" "}
          <strong>Anthropic PBC</strong>{" "}(États-Unis), fournisseur du modèle de
          langage. Cette fiche contient les indicateurs de la période, les
          libellés des pages et des requêtes retenues, le nom du client et son
          secteur d&apos;activité. Elle ne contient aucun identifiant de
          connexion, aucun jeton, aucune adresse e-mail et aucune donnée de
          compte. Tous les chiffres y sont calculés à l&apos;avance par le
          service&nbsp;: le modèle interprète, il ne calcule pas.
        </p>
      </LegalSection>

      <LegalSection title="Ce que le service ne fait pas">
        <ul className={UL}>
          <li>Aucune vente, location ou cession de données à des tiers.</li>
          <li>Aucune publicité, aucun ciblage, aucun profilage publicitaire.</li>
          <li>
            Aucun traceur publicitaire ni cookie tiers sur les pages du service.
          </li>
          <li>
            Aucune réutilisation des données d&apos;un utilisateur pour un autre
            utilisateur&nbsp;: chaque compte est cloisonné.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Sous-traitants">
        <ul className={UL}>
          <li>
            <strong>{HOST.name}</strong>{" "}— hébergement du serveur ({HOST.address}
            ). Le serveur est localisé dans l&apos;{HOST.region}.
          </li>
          <li>
            <strong>Anthropic PBC</strong>{" "}(États-Unis) — génération des
            commentaires d&apos;analyse, uniquement lorsque cette fonction est
            activée et déclenchée par un utilisateur.
          </li>
        </ul>
        <p>
          Aucun autre sous-traitant n&apos;intervient. La liste est mise à jour
          si elle change.
        </p>
      </LegalSection>

      <LegalSection title="Durées de conservation">
        <ul className={UL}>
          <li>
            <strong>Compte utilisateur</strong>&nbsp;: conservé tant que le compte
            existe, supprimé sur demande.
          </li>
          <li>
            <strong>Autorisations d&apos;accès</strong>&nbsp;: conservées jusqu&apos;à
            la déconnexion de la plateforme concernée, qui les efface
            immédiatement.
          </li>
          <li>
            <strong>Statistiques et rapports</strong>&nbsp;: conservés tant que le
            client existe dans le service. Supprimer un client supprime ses
            rapports, ses liens de suivi et leurs compteurs.
          </li>
          <li>
            <strong>Compteurs de liens</strong>&nbsp;: conservés par jour, sans
            donnée individuelle, tant que le lien existe.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Sécurité">
        <p>
          Les échanges avec le service sont chiffrés en transit (HTTPS). Les
          jetons d&apos;accès aux plateformes et les secrets des applications
          enregistrées sont chiffrés au repos. Les mots de passe sont conservés
          sous forme de condensat. L&apos;accès aux données d&apos;un client est
          restreint aux comptes auxquels ce client a été explicitement attribué.
          Les rapports partagés par lien public sont accessibles via une adresse
          non devinable, révocable à tout moment par l&apos;utilisateur.
        </p>
      </LegalSection>

      <LegalSection title="Cookies">
        <p>
          Le service dépose un unique cookie, strictement nécessaire au maintien
          de votre session une fois connecté. Il n&apos;y a ni cookie
          publicitaire, ni cookie de mesure d&apos;audience tiers, ni partage
          avec un réseau social. Aucun consentement n&apos;est donc requis, et
          rien n&apos;est déposé avant connexion.
        </p>
      </LegalSection>

      <LegalSection title="Vos droits">
        <p>
          Conformément au Règlement général sur la protection des données
          (RGPD) et à la loi sénégalaise n° 2008-12 sur la protection des
          données à caractère personnel, vous disposez d&apos;un droit
          d&apos;accès, de rectification, d&apos;effacement, de limitation,
          d&apos;opposition et de portabilité sur les données vous concernant.
        </p>
        <p>
          Pour l&apos;exercer, écrivez à {PUBLISHER.name}
          {PUBLISHER.email ? ` à l'adresse ${PUBLISHER.email}` : ""}. Vous pouvez
          également introduire une réclamation auprès de la Commission de
          protection des données personnelles du Sénégal (CDP) ou, si vous
          résidez dans l&apos;Union européenne, auprès de l&apos;autorité de
          contrôle de votre pays.
        </p>
        <p>
          Si vos données figurent dans un rapport produit par une agence
          utilisant {APP.name}, adressez votre demande à cette agence&nbsp;: elle
          est responsable du traitement, et nous l&apos;assistons pour y
          répondre.
        </p>
      </LegalSection>

      <LegalSection title="Transferts hors de l'Union européenne">
        <p>
          Les données sont stockées sur un serveur situé dans l&apos;
          {HOST.region}. Le seul transfert hors Union européenne concerne la
          fonction d&apos;analyse décrite plus haut, vers Anthropic PBC aux
          États-Unis, et uniquement lorsqu&apos;un utilisateur la déclenche.
        </p>
      </LegalSection>

      <LegalSection title="Modifications">
        <p>
          Cette politique peut évoluer avec le service. La date de la version en
          vigueur figure en tête de page. Toute modification substantielle est
          signalée aux utilisateurs du service.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
