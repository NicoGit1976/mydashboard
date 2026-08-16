import type { Metadata } from "next";
import LegalShell, { LegalSection } from "@/components/legal/LegalShell";
import { APP, HOST, PUBLISHER } from "@/lib/legal";

// Public legal notice. Same audience as the privacy policy: platform
// reviewers, clients, and anyone who wants to know who stands behind the tool.

export const metadata: Metadata = {
  title: `Mentions légales — ${APP.name}`,
  description: "Éditeur, hébergeur et conditions d'utilisation de MyDashboard.",
  robots: { index: true, follow: true },
};

export default function LegalNoticePage() {
  return (
    <LegalShell
      title="Mentions légales"
      intro={`Informations relatives à l'éditeur et à l'hébergeur de ${APP.name}, accessible à l'adresse ${APP.url}.`}
    >
      <LegalSection title="Éditeur">
        <p>
          {PUBLISHER.name}
          {PUBLISHER.legalForm ? `, ${PUBLISHER.legalForm}` : ""}
          {PUBLISHER.address ? <>, {PUBLISHER.address}</> : ""}, {PUBLISHER.city}
          , {PUBLISHER.country}.
        </p>
        {PUBLISHER.registration && <p>{PUBLISHER.registration}</p>}
        <p>Directeur de la publication&nbsp;: {PUBLISHER.director}.</p>
        {PUBLISHER.email && <p>Contact&nbsp;: {PUBLISHER.email}</p>}
        <p>
          Site institutionnel&nbsp;:{" "}
          <a
            href={PUBLISHER.site}
            className="underline underline-offset-2 hover:text-ink"
            rel="noopener"
          >
            {PUBLISHER.site.replace(/^https:\/\//, "")}
          </a>
        </p>
      </LegalSection>

      <LegalSection title="Hébergeur">
        <p>
          {HOST.name}, {HOST.address}. Serveur localisé dans l&apos;{HOST.region}.
        </p>
      </LegalSection>

      <LegalSection title="Objet du service">
        <p>
          {APP.name}{" "}est un outil professionnel de reporting marketing, réservé
          aux utilisateurs disposant d&apos;un compte. Il rassemble les
          statistiques publiées par les plateformes auxquelles ses utilisateurs
          ont accès et les met en forme dans des rapports destinés à leurs
          clients. Il n&apos;est pas ouvert à l&apos;inscription libre.
        </p>
      </LegalSection>

      <LegalSection title="Propriété intellectuelle">
        <p>
          Le service, son code, son interface et ses contenus sont la propriété
          de {PUBLISHER.name}. Les marques, logos et contenus des clients
          affichés dans les rapports restent la propriété de leurs titulaires
          respectifs et ne sont utilisés que pour la production de ces rapports.
        </p>
      </LegalSection>

      <LegalSection title="Responsabilité">
        <p>
          Les chiffres présentés dans les rapports proviennent des interfaces de
          programmation des plateformes concernées. Leur exactitude, leur
          disponibilité et leur méthode de calcul relèvent de ces plateformes.
          Le service les restitue sans les modifier et signale visiblement les
          valeurs de démonstration tant qu&apos;une source n&apos;est pas
          connectée.
        </p>
      </LegalSection>

      <LegalSection title="Données personnelles">
        <p>
          Le traitement des données est décrit dans la{" "}
          <a
            href="/confidentialite"
            className="underline underline-offset-2 hover:text-ink"
          >
            politique de confidentialité
          </a>
          .
        </p>
      </LegalSection>
    </LegalShell>
  );
}
