export type RateSummary = {
    rateID: string;
    roomRate: number;
    totalRate: number;
    roomsAvailable: number;
    isDerived: boolean;
    ratePlanID?: string;
    ratePlanNamePublic?: string;
    ratePlanNamePrivate?: string;
    promoCode?: string;
    derivedType?: string;
    derivedValue?: number;
    baseRate?: number;
    ratePlanAddOns?: unknown[];
};