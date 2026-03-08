// Re-export all types so consumers can import from a single place if desired.
export type {
    MedicationKey,
    InvegaType,
    MaintenanceDose,
    TrinzaDose,
    AbilifyDoses,
    AristadaDose,
    UzedyDose,
    HafyeraCategory,
    GuidanceResult,
    AristadaGuidanceResult,
    LateTier,
    HaloperidolPriorDoses,
    FluphenazinePriorDoses,
    VivitrolIndication,
    SublocadeType,
    BrixadiType,
} from './types';

import type {
    MedicationKey,
    MaintenanceDose,
    TrinzaDose,
    AbilifyDoses,
    AristadaDose,
    UzedyDose,
    HafyeraCategory,
    GuidanceResult,
    AristadaGuidanceResult,
    LateTier,
    HaloperidolPriorDoses,
    FluphenazinePriorDoses,
    VivitrolIndication,
    SublocadeType,
    BrixadiType,
} from './types';

import {
    MEDICATION_DISPLAY_NAMES,
    EARLY_GUIDANCE_CONTENT,
    INVEGA_INITIATION_TIERS,
    INVEGA_MAINTENANCE_TIERS,
    INVEGA_TRINZA_TIERS,
    HAFYERA_THRESHOLDS,
    ABILIFY_NOT_DUE_GUIDANCE,
    ABILIFY_ROUTINE_GUIDANCE,
    ABILIFY_REINITIATE_GUIDANCE,
    ABILIFY_PRIOR_DOSE_GROUPS,
    ARISTADA_NOT_DUE_BEFORE_DAYS,
    ARISTADA_NOT_DUE_MESSAGE,
    ARISTADA_DOSE_CONFIGS,
    UZEDY_TIERS,
    HALOPERIDOL_DOSE_GROUPS,
    FLUPHENAZINE_DOSE_GROUPS,
    VIVITROL_TIERS,
    SUBLOCADE_TIERS,
    BRIXADI_TIERS,
} from './constants';

// ─── Generic Tier Resolver ────────────────────────────────────────────────────

/**
 * Finds the first tier whose maxDays >= daysSince and returns its guidance.
 * For dose-variant tiers, `dose` is used to pick the right guidance object.
 */
export function resolveLateTier(tiers: LateTier[], daysSince: number, dose?: string): GuidanceResult {
    const tier = tiers.find(t => daysSince <= t.maxDays) ?? tiers[tiers.length - 1];
    if (tier.type === 'dose-variant') {
        return tier.guidanceByDose[dose!];
    }
    return tier.guidance;
}

// ─── Lookup Helpers ───────────────────────────────────────────────────────────

export function getMedicationDisplayName(medication: string): string {
    return MEDICATION_DISPLAY_NAMES[medication as MedicationKey] ?? medication;
}

export function getEarlyGuidanceContent(medication: string): string {
    return EARLY_GUIDANCE_CONTENT[medication as MedicationKey]
        ?? 'Please consult the DESC LAI standing order document for specific guidance.';
}

// ─── Date / Time Utilities ────────────────────────────────────────────────────

export function daysSinceDate(dateString: string): number {
    const [year, month, day] = dateString.split('-').map(Number);
    const past  = new Date(year, month - 1, day); // local midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);                    // local midnight
    return Math.floor((today.getTime() - past.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatWeeksAndDays(totalDays: number): string {
    const weeks         = Math.floor(totalDays / 7);
    const remainingDays = totalDays % 7;

    if (weeks === 0) {
        return `${remainingDays} day${remainingDays !== 1 ? 's' : ''}`;
    } else if (remainingDays === 0) {
        return `${weeks} week${weeks !== 1 ? 's' : ''}`;
    } else {
        return `${weeks} week${weeks !== 1 ? 's' : ''}, ${remainingDays} day${remainingDays !== 1 ? 's' : ''}`;
    }
}

export function formatDate(dateString: string): string {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day); // local midnight
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// ─── Guidance Functions (thin wrappers over resolveLateTier + constants) ─────

/**
 * Returns guidance for a missed/delayed 2nd initiation (156 mg) Invega Sustenna injection.
 * @param daysSince - days since the first (234 mg) injection
 */
export function getInvegaInitiationGuidance(daysSince: number): GuidanceResult {
    return resolveLateTier(INVEGA_INITIATION_TIERS, daysSince);
}

/**
 * Returns guidance for a missed/delayed monthly maintenance Invega Sustenna injection.
 */
export function getInvegaMaintenanceGuidance(daysSince: number, maintenanceDose: MaintenanceDose): GuidanceResult {
    return resolveLateTier(INVEGA_MAINTENANCE_TIERS, daysSince, maintenanceDose);
}

/**
 * Returns guidance for a missed/delayed Invega Trinza injection.
 */
export function getInvegaTrinzaGuidance(daysSince: number, trinzaDose: TrinzaDose): GuidanceResult {
    return resolveLateTier(INVEGA_TRINZA_TIERS, daysSince, trinzaDose);
}

/**
 * Returns category for a missed/delayed Invega Hafyera injection.
 */
export function getInvegaHafyeraGuidanceCategory(daysSince: number): HafyeraCategory {
    if (daysSince <= HAFYERA_THRESHOLDS.earlyMaxDays)  return 'early';
    if (daysSince <= HAFYERA_THRESHOLDS.onTimeMaxDays) return 'on-time';
    return 'consult';
}

/**
 * Returns guidance for a missed/delayed Abilify Maintena injection.
 */
export function getAbilifyMaintenaGuidance(weeksSince: number, abilifyDoses: AbilifyDoses): GuidanceResult {
    if (weeksSince < 4) return ABILIFY_NOT_DUE_GUIDANCE;

    const group = ABILIFY_PRIOR_DOSE_GROUPS.find(g => g.priorDoses === abilifyDoses)!;
    return weeksSince <= group.routineMaxWeeks
        ? ABILIFY_ROUTINE_GUIDANCE
        : ABILIFY_REINITIATE_GUIDANCE;
}

/**
 * Returns guidance for a missed/delayed Aristada injection.
 */
export function getAristadaGuidance(daysSince: number, aristadaDose: AristadaDose): AristadaGuidanceResult {
    if (daysSince < ARISTADA_NOT_DUE_BEFORE_DAYS) {
        return { notDue: true, message: ARISTADA_NOT_DUE_MESSAGE };
    }

    const config = ARISTADA_DOSE_CONFIGS.find(c => c.dose === aristadaDose)!;
    const tier   = config.tiers.find(t => daysSince <= t.maxDays) ?? config.tiers[config.tiers.length - 1];

    return {
        notDue:               false,
        supplementation:      tier.supplementation,
        providerNotification: tier.providerNotification,
    };
}

/**
 * Returns guidance for a missed/delayed Uzedy injection.
 */
export function getUzedyGuidance(daysSince: number, uzedyDose: UzedyDose): GuidanceResult {
    return resolveLateTier(UZEDY_TIERS, daysSince, uzedyDose);
}

/**
 * Returns guidance for a missed/delayed Haloperidol Decanoate injection.
 */
export function getHaloperidolGuidance(daysSince: number, priorDoses: HaloperidolPriorDoses): GuidanceResult {
    const group = HALOPERIDOL_DOSE_GROUPS.find(g => g.priorDoses === priorDoses)!;
    return resolveLateTier(group.tiers, daysSince);
}

/**
 * Returns guidance for a missed/delayed Fluphenazine Decanoate injection.
 */
export function getFluphenazineGuidance(daysSince: number, priorDoses: FluphenazinePriorDoses): GuidanceResult {
    const group = FLUPHENAZINE_DOSE_GROUPS.find(g => g.priorDoses === priorDoses)!;
    return resolveLateTier(group.tiers, daysSince);
}

/**
 * Returns guidance for a missed/delayed Vivitrol injection.
 */
export function getVivitrolGuidance(daysSince: number, indication: VivitrolIndication): GuidanceResult {
    return resolveLateTier(VIVITROL_TIERS[indication], daysSince);
}

/**
 * Returns guidance for a missed/delayed Sublocade injection.
 */
export function getSublocadeGuidance(daysSince: number, sublocadeType: SublocadeType): GuidanceResult {
    return resolveLateTier(SUBLOCADE_TIERS[sublocadeType], daysSince);
}

/**
 * Returns guidance for a missed/delayed Brixadi injection.
 */
export function getBrixadiGuidance(daysSince: number, brixadiType: BrixadiType): GuidanceResult {
    return resolveLateTier(BRIXADI_TIERS[brixadiType], daysSince);
}
