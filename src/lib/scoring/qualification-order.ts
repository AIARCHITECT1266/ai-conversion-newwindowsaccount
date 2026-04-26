/**
 * Zentrale Sortier-Reihenfolgen fuer Lead-Qualification-Stages.
 *
 * Annahmen:
 * - LeadQualification-Enum aus Prisma-Schema ist die kanonische
 *   Quelle. Diese Datei definiert nur DISPLAY-Reihenfolgen.
 * - Drei Display-Modi:
 *   - LOW_TO_HIGH: Funnel-Sicht (Pipeline-API-Standard, KPI-Cards,
 *     Yesterday-Section, Settings-Form, defensive API-Index-Pruefung)
 *   - HIGH_TO_LOW: Operations-Sicht (aktuell ungenutzt, vorbereitet
 *     fuer kuenftige "heisseste Stages zuerst"-Anzeigen ohne
 *     Disqualifikations-Sonderbehandlung)
 *   - PIPELINE_DISPLAY: Lead-Pipeline-spezifisch — heisseste oben,
 *     Disqualifikation als abgesetzter Bucket unten
 *
 * Repo-Hinweis: LeadQualification kommt aus `@/generated/prisma/enums`
 * (Prisma-Client-Output ist auf src/generated/prisma konfiguriert,
 * siehe prisma/schema.prisma generator-Block).
 *
 * Tenant-Isolation: nicht betroffen. Reine UI-Order-Konstanten.
 */

import type { LeadQualification } from "@/generated/prisma/enums";

/**
 * Funnel-Sicht von kalt nach heiss.
 * Verwendung: KPI-ScoreBar, Yesterday-Section, Settings-Form,
 * yesterday/stats-API-Routes (defensive Index-Pruefung).
 */
export const QUALIFICATION_ORDER_LOW_TO_HIGH: readonly LeadQualification[] = [
  "UNQUALIFIED",
  "MARKETING_QUALIFIED",
  "SALES_QUALIFIED",
  "OPPORTUNITY",
  "CUSTOMER",
] as const;

/**
 * Operations-Sicht von heiss nach kalt.
 * Aktuell ungenutzt, vorbereitet fuer kuenftige "heisseste
 * Stages zuerst"-Anzeigen ohne Disqualifikations-Sonderbehandlung.
 */
export const QUALIFICATION_ORDER_HIGH_TO_LOW: readonly LeadQualification[] = [
  "CUSTOMER",
  "OPPORTUNITY",
  "SALES_QUALIFIED",
  "MARKETING_QUALIFIED",
  "UNQUALIFIED",
] as const;

/**
 * Pipeline-Display-Reihenfolge mit Disqualifikations-Bucket unten.
 * - CUSTOMER (Conversion) ganz oben
 * - OPP, SQL, MQL absteigend
 * - UNQUALIFIED am Ende, visuell abgesetzt
 *
 * UI-Komponente muss Index 4 (UNQUALIFIED) als "disqualified"
 * stylen (z.B. Trennlinie davor, gedaempfte Opacity).
 */
export const QUALIFICATION_PIPELINE_DISPLAY: readonly LeadQualification[] = [
  "CUSTOMER",
  "OPPORTUNITY",
  "SALES_QUALIFIED",
  "MARKETING_QUALIFIED",
  "UNQUALIFIED",
] as const;

/**
 * Stage, ab der Items als "disqualified" gerendert werden sollen.
 * Aktuell UNQUALIFIED.
 *
 * UI-Verwendung in Lead-Pipeline:
 *   const isDisqualified = stage === QUALIFICATION_PIPELINE_DISQUALIFIED_FROM;
 */
export const QUALIFICATION_PIPELINE_DISQUALIFIED_FROM: LeadQualification =
  "UNQUALIFIED";
