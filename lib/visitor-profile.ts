import type { CalculateParams } from "lib/validation/calculate";

type IncomeBand = "lt25k" | "25k-45k" | "45k-75k" | "75k-120k" | "120k+";

export type ProfileType =
  | "job_seeker"
  | "business_owner"
  | "dual_income_family"
  | "family"
  | "retiree"
  | "student"
  | "homeowner"
  | "renter"
  | "high_wealth"
  | "unknown";

export interface ProfileSignals {
  grossIncome: number;
  netIncome?: number;
  incomeBand: IncomeBand;
  hasPartner: boolean;
  hasKids: boolean;
  isBusinessOwner: boolean;
  isRetired: boolean;
  isHomeOwner: boolean;
  isRenter: boolean;
  hasStudentDebt: boolean;
  hasHighWealth: boolean;
  province: string;
  municipalityCategory: string;
}

export interface RankedPartner {
  id: string;
  slug: string;
  name: string;
  tier: string;
  score: number;
  reasons: string[];
}

interface TenantCandidate {
  id: string;
  slug: string;
  name: string;
  partnerTier: string;
  partnerDescription: string | null;
  showOnPartnerPage: boolean;
  isActive: boolean;
  partnerPageOrder: number;
  customConfig: unknown;
}

interface TenantConfig {
  targetProfiles?: string[];
  provinces?: string[];
  minIncome?: number;
  maxIncome?: number;
  tags?: string[];
}

function incomeBand(grossIncome: number): IncomeBand {
  if (grossIncome < 25_000) return "lt25k";
  if (grossIncome < 45_000) return "25k-45k";
  if (grossIncome < 75_000) return "45k-75k";
  if (grossIncome < 120_000) return "75k-120k";
  return "120k+";
}

export function deriveProfileSignals(
  params: Pick<
    CalculateParams,
    | "employment"
    | "zzpIncome"
    | "hasPartner"
    | "hasKids"
    | "isAOW"
    | "hasHome"
    | "isRenter"
    | "duoSchuld"
    | "box3Spaargeld"
    | "box3Beleggingen"
    | "box3Schulden"
    | "provincie"
    | "gemCategorie"
  >,
  grossIncome: number,
  netIncome?: number
): ProfileSignals {
  const wealth = (params.box3Spaargeld || 0) + (params.box3Beleggingen || 0) - (params.box3Schulden || 0);

  return {
    grossIncome,
    netIncome,
    incomeBand: incomeBand(grossIncome),
    hasPartner: !!params.hasPartner,
    hasKids: !!params.hasKids,
    isBusinessOwner: (params.zzpIncome || 0) > 0,
    isRetired: !!params.isAOW,
    isHomeOwner: !!params.hasHome,
    isRenter: !!params.isRenter,
    hasStudentDebt: (params.duoSchuld || 0) > 0,
    hasHighWealth: wealth >= 125_000,
    province: params.provincie || "Onbekend",
    municipalityCategory: params.gemCategorie || "midden",
  };
}

export function deriveProfileType(signals: ProfileSignals): ProfileType {
  if (signals.isRetired) return "retiree";
  if (signals.isBusinessOwner) return "business_owner";
  if (signals.hasHighWealth) return "high_wealth";
  if (signals.hasStudentDebt && signals.grossIncome <= 45_000) return "student";
  if (signals.hasKids && signals.hasPartner) return "dual_income_family";
  if (signals.hasKids) return "family";
  if (signals.isHomeOwner) return "homeowner";
  if (signals.isRenter) return "renter";
  if (signals.grossIncome >= 30_000 && signals.grossIncome <= 95_000) return "job_seeker";
  return "unknown";
}

function parseTenantConfig(raw: unknown): TenantConfig {
  if (!raw || typeof raw !== "object") return {};
  const cfg = raw as Record<string, unknown>;
  const targetProfiles = Array.isArray(cfg.targetProfiles)
    ? cfg.targetProfiles.filter((x): x is string => typeof x === "string")
    : undefined;
  const provinces = Array.isArray(cfg.provinces)
    ? cfg.provinces.filter((x): x is string => typeof x === "string")
    : undefined;
  const tags = Array.isArray(cfg.tags)
    ? cfg.tags.filter((x): x is string => typeof x === "string")
    : undefined;
  const minIncome = typeof cfg.minIncome === "number" ? cfg.minIncome : undefined;
  const maxIncome = typeof cfg.maxIncome === "number" ? cfg.maxIncome : undefined;
  return { targetProfiles, provinces, tags, minIncome, maxIncome };
}

function tierBonus(tier: string): number {
  if (tier === "featured") return 20;
  if (tier === "standard") return 8;
  return 0;
}

export function rankPartnersForProfile(
  partners: TenantCandidate[],
  profileType: ProfileType,
  signals: ProfileSignals
): RankedPartner[] {
  const ranked = partners
    .filter((p) => p.isActive && p.showOnPartnerPage)
    .map((partner) => {
      const config = parseTenantConfig(partner.customConfig);
      let score = tierBonus(partner.partnerTier);
      const reasons: string[] = [];

      const targetProfiles = config.targetProfiles ?? [];
      if (targetProfiles.length > 0) {
        if (targetProfiles.includes(profileType)) {
          score += 65;
          reasons.push("profile_match");
        } else if (targetProfiles.includes("all")) {
          score += 20;
          reasons.push("generic_match");
        } else {
          score -= 15;
        }
      }

      const provinces = config.provinces ?? [];
      if (provinces.length > 0 && signals.province) {
        if (provinces.includes(signals.province)) {
          score += 18;
          reasons.push("province_match");
        } else {
          score -= 6;
        }
      }

      if (typeof config.minIncome === "number" && signals.grossIncome >= config.minIncome) {
        score += 6;
        reasons.push("income_floor_match");
      }
      if (typeof config.maxIncome === "number" && signals.grossIncome <= config.maxIncome) {
        score += 6;
        reasons.push("income_cap_match");
      }

      const tags = (config.tags ?? []).map((t) => t.toLowerCase());
      if (signals.isBusinessOwner && (tags.includes("zzp") || tags.includes("business") || tags.includes("entrepreneur"))) {
        score += 10;
        reasons.push("business_tag_match");
      }
      if (signals.hasKids && tags.includes("family")) {
        score += 8;
        reasons.push("family_tag_match");
      }
      if (signals.isHomeOwner && tags.includes("mortgage")) {
        score += 8;
        reasons.push("home_tag_match");
      }
      if (signals.hasHighWealth && tags.includes("wealth")) {
        score += 8;
        reasons.push("wealth_tag_match");
      }

      return {
        id: partner.id,
        slug: partner.slug,
        name: partner.name,
        tier: partner.partnerTier,
        score,
        reasons,
        order: partner.partnerPageOrder,
      };
    })
    .filter((p) => p.score > -10)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.order - b.order;
    })
    .map(({ order: _order, ...rest }) => rest);

  return ranked;
}

export function sanitizeCalculationParams(params: CalculateParams): Record<string, unknown> {
  return {
    employment: params.employment,
    zzpIncome: params.zzpIncome,
    hasPartner: params.hasPartner,
    inc2: params.inc2,
    hasKids: params.hasKids,
    nKids: params.nKids,
    nKidsOpvang: params.nKidsOpvang,
    isRenter: params.isRenter,
    rent: params.rent,
    hasHome: params.hasHome,
    hypotheek: params.hypotheek,
    rentePerc: params.rentePerc,
    wozWaarde: params.wozWaarde,
    box2Income: params.box2Income,
    box3Spaargeld: params.box3Spaargeld,
    box3Beleggingen: params.box3Beleggingen,
    box3Schulden: params.box3Schulden,
    duoSchuld: params.duoSchuld,
    provincie: params.provincie,
    gemCategorie: params.gemCategorie,
  };
}
