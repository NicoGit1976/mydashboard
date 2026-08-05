import type { Publisher, PublishResult } from "@/lib/publishers/types";
import { publishLinkedinMember } from "@/lib/publishers/linkedin-member";
import { publishFacebookPage } from "@/lib/publishers/facebook-page";
import { publishInstagramBusiness } from "@/lib/publishers/instagram-business";

// Dispatch by canonical provider key. A provider whose publisher isn't wired
// yet fails PERMANENTLY with an honest message — never silently retried.

const PUBLISHERS: Record<string, Publisher> = {
  linkedin: publishLinkedinMember,
  meta_fb: publishFacebookPage,
  meta_ig: publishInstagramBusiness,
};

const NOT_READY: Record<string, string> = {
  x: "Le compte X n'est pas encore connecté (OAuth X à venir).",
  gmb: "Accès API Google Business en attente d'approbation.",
};

export function getPublisher(provider: string): Publisher {
  const p = PUBLISHERS[provider];
  if (p) return p;
  return async (): Promise<PublishResult> => ({
    ok: false,
    kind: "permanent",
    message: NOT_READY[provider] ?? `Réseau « ${provider} » non pris en charge.`,
  });
}
