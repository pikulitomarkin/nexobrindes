// Centralized pricing calculation utilities
// Goal: keep price calculation consistent across Admin Products + Admin Budgets + Vendor Budgets.

export type PricingSettingsLike = {
  taxRate?: string | number | null;
  commissionRate?: string | number | null;
};

export type MarginTierLike = {
  minRevenue?: string | number | null;
  maxRevenue?: string | number | null;
  marginRate?: string | number | null;
  minimumMarginRate?: string | number | null;
  order?: number | null;
};

export type ProductPriceLike = {
  costPrice?: string | number | null;
  basePrice?: string | number | null;
};

function toNumber(v: unknown): number {
  if (v === null || v === undefined) return NaN;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    // Handle numbers coming as "10.00" or "10,00"
    const normalized = v.replace(',', '.');
    return Number(normalized);
  }
  return Number(v);
}

function percentToRate(v: unknown, fallbackPercent: number): number {
  const n = toNumber(v);
  if (Number.isNaN(n)) return fallbackPercent / 100;
  return n / 100;
}

function roundMoney(v: number): number {
  // Consistent 2-decimal rounding for currency
  return Math.round((v + Number.EPSILON) * 100) / 100;
}

export function pickTierForRevenue(
  marginTiers: MarginTierLike[] | undefined | null,
  revenue: number,
): {
  marginRate: number; // as rate (0-1)
  minimumMarginRate: number; // as rate (0-1)
} {
  // Defaults (match legacy UI defaults)
  let marginRate = 0.28;
  let minimumMarginRate = 0.20;

  if (!marginTiers || marginTiers.length === 0) {
    return { marginRate, minimumMarginRate };
  }

  // Sort by order if available, otherwise by minRevenue
  const tiers = [...marginTiers].sort((a, b) => {
    const ao = a.order ?? null;
    const bo = b.order ?? null;
    if (ao !== null && bo !== null) return ao - bo;
    const amin = toNumber(a.minRevenue) || 0;
    const bmin = toNumber(b.minRevenue) || 0;
    return amin - bmin;
  });

  for (const tier of tiers) {
    const minRev = toNumber(tier.minRevenue);
    const maxRev =
      tier.maxRevenue === null || tier.maxRevenue === undefined || String(tier.maxRevenue) === ''
        ? Number.POSITIVE_INFINITY
        : toNumber(tier.maxRevenue);

    const min = Number.isNaN(minRev) ? 0 : minRev;
    const max = Number.isNaN(maxRev) ? Number.POSITIVE_INFINITY : maxRev;

    if (revenue >= min && revenue <= max) {
      marginRate = percentToRate(tier.marginRate, 28);
      minimumMarginRate = percentToRate(tier.minimumMarginRate, 20);
      break;
    }
  }

  return { marginRate, minimumMarginRate };
}

export function calculatePriceFromCost(
  costPrice: number,
  budgetRevenue: number,
  pricingSettings: PricingSettingsLike | null | undefined,
  marginTiers: MarginTierLike[] | null | undefined,
) {
  if (!pricingSettings || !costPrice || costPrice <= 0) {
    return { idealPrice: 0, minimumPrice: 0, marginApplied: 0, minimumMarginApplied: 0 };
  }

  const taxRate = percentToRate(pricingSettings.taxRate, 9);
  const commissionRate = percentToRate(pricingSettings.commissionRate, 15);
  const { marginRate, minimumMarginRate } = pickTierForRevenue(marginTiers, budgetRevenue);

  const divisorIdeal = 1 - (taxRate + commissionRate + marginRate);
  const divisorMin = 1 - (taxRate + commissionRate + minimumMarginRate);

  // Guard against invalid divisor
  const idealPrice = divisorIdeal > 0 ? costPrice / divisorIdeal : 0;
  const minimumPrice = divisorMin > 0 ? costPrice / divisorMin : 0;

  return {
    idealPrice: roundMoney(idealPrice),
    minimumPrice: roundMoney(minimumPrice),
    marginApplied: roundMoney(marginRate * 100),
    minimumMarginApplied: roundMoney(minimumMarginRate * 100),
  };
}

/**
 * Returns the sale price to display/apply.
 * Safety rule:
 * - If costPrice is missing/zero OR costPrice equals basePrice, assume basePrice is already the intended sale price.
 *   This prevents "markup on top of markup" when cost was accidentally overwritten with base price.
 */
export function getProductSalePrice(
  product: ProductPriceLike,
  budgetRevenue: number,
  pricingSettings: PricingSettingsLike | null | undefined,
  marginTiers: MarginTierLike[] | null | undefined,
) {
  const cost = toNumber(product.costPrice);
  const base = toNumber(product.basePrice);

  const hasBase = !Number.isNaN(base) && base > 0;
  const hasCost = !Number.isNaN(cost) && cost > 0;

  // Se tem costPrice válido e configurações de pricing, SEMPRE calcular com margem
  if (hasCost && pricingSettings) {
    const details = calculatePriceFromCost(cost, budgetRevenue, pricingSettings, marginTiers);
    if (details.idealPrice > 0) {
      return { price: details.idealPrice, source: 'computed' as const, details };
    }
  }

  // Fallback: se não tem costPrice ou pricingSettings inválido, usa basePrice
  if (hasBase) {
    return { price: roundMoney(base), source: 'base' as const };
  }

  // Nenhum preço disponível
  return { price: 0, source: 'base' as const };
}
