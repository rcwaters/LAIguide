import type { EarlyVariantDef, CoreDef } from '../interfaces/med';

type RawEarlyVariant = {
    key: string;
    minDays?: number;
    sameAs?: string;
    guidanceNote?: string[];
};

function buildEarlyVariantMap(variants: RawEarlyVariant[]): Record<string, EarlyVariantDef> {
    const map: Record<string, EarlyVariantDef> = {};
    for (const v of variants) {
        if (!v.sameAs) {
            map[v.key] = {
                minDays: v.minDays,
                ...(v.guidanceNote?.length ? { guidanceNote: v.guidanceNote } : {}),
            };
        }
    }
    for (const v of variants) {
        if (v.sameAs) map[v.key] = map[v.sameAs]!;
    }
    return map;
}

export function pluralDays(n: number): string {
    return n % 7 === 0 && n >= 7
        ? `${n / 7} week${n / 7 === 1 ? '' : 's'}`
        : `${n} day${n === 1 ? '' : 's'}`;
}

export function composeEarlyGuidance(
    daysBeforeDue: number | undefined,
    minDays: number | undefined,
    notes: string[] | undefined,
): string {
    let core: string;
    if (daysBeforeDue != null && minDays != null) {
        core = `${pluralDays(daysBeforeDue)} before due date; no sooner than ${pluralDays(minDays)} after last injection`;
    } else if (daysBeforeDue != null) {
        core = `${pluralDays(daysBeforeDue)} before due date`;
    } else {
        core = `No sooner than ${pluralDays(minDays!)} after last injection`;
    }
    if (!notes?.length) return core;
    return `${core}\n${notes.map((n) => `- ${n}`).join('\n')}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildEarlyFields(
    early: any,
    earlySpec: any,
): Omit<Partial<CoreDef>, 'earlyGuidance'> {
    const daysBeforeDue = early?.daysBeforeDue as number | undefined;
    const minDays = early?.minDays as number | undefined;
    const providerNotifications = early?.providerNotifications as string[] | undefined;
    const rawVariants = early?.variants as RawEarlyVariant[] | undefined;
    const paramField = earlySpec?.paramField as string | undefined;
    const dateField = earlySpec?.dateField as string | undefined;
    return {
        ...(daysBeforeDue != null ? { earlyDaysBeforeDue: daysBeforeDue } : {}),
        ...(minDays != null ? { earlyMinDays: minDays } : {}),
        ...(providerNotifications?.length
            ? { earlyProviderNotification: providerNotifications }
            : {}),
        ...(rawVariants ? { earlyVariantMap: buildEarlyVariantMap(rawVariants) } : {}),
        ...(early?.guidanceNote?.length
            ? { earlySharedNotes: early.guidanceNote as string[] }
            : {}),
        ...(paramField ? { earlyParamField: paramField, earlyDateField: dateField } : {}),
    };
}
