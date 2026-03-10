import { z } from "zod";

const gemCategorieSchema = z.enum(["laag", "midden", "hoog"]);

export const calculateParamsSchema = z.object({
  employment: z.number().min(0).max(1_000_000),
  zzpIncome: z.number().min(0).max(1_000_000),
  hasPartner: z.boolean(),
  inc2: z.number().min(0).max(1_000_000),
  pensioenPerc: z.number().min(0).max(100),
  isAOW: z.boolean(),
  hasKids: z.boolean(),
  nKids: z.number().int().min(0).max(20),
  kidsU12: z.number().int().min(0).max(20),
  nKidsOpvang: z.number().int().min(0).max(20),
  kotUur: z.number().min(0).max(24),
  kotUren: z.number().min(0).max(999),
  isRenter: z.boolean(),
  rent: z.number().min(0).max(100_000),
  hasHome: z.boolean(),
  hypotheek: z.number().min(0).max(10_000_000),
  rentePerc: z.number().min(0).max(30),
  wozWaarde: z.number().min(0).max(10_000_000),
  isStarter: z.boolean(),
  urenOK: z.boolean(),
  duoSchuld: z.number().min(0).max(1_000_000),
  box2Income: z.number().min(0).max(1_000_000),
  box3Spaargeld: z.number().min(0).max(1_000_000_000),
  box3Beleggingen: z.number().min(0).max(1_000_000_000),
  box3Schulden: z.number().min(0).max(1_000_000_000),
  wwwiaIncome: z.number().min(0).max(1_000_000),
  hasVolWW: z.boolean(),
  hasVolWIA: z.boolean(),
  alimentatieBetaald: z.number().min(0).max(1_000_000),
  alimentatieOntvangen: z.number().min(0).max(1_000_000),
  lijfrentePremie: z.number().min(0).max(1_000_000),
  provincie: z.string().trim().max(64).default("Onbekend"),
  gemCategorie: gemCategorieSchema.default("midden"),
});

export type CalculateParams = z.infer<typeof calculateParamsSchema>;
