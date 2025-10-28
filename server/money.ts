import Decimal from "decimal.js";

/**
 * Helper functions for safe decimal/money operations
 * PROIBIDO usar parseFloat para valores monetários
 */

// Configure Decimal.js for monetary precision (2 decimal places)
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

/**
 * Convert string to Decimal for safe calculations
 */
export function toDecimal(value: string | number | Decimal): Decimal {
  if (value instanceof Decimal) {
    return value;
  }
  return new Decimal(value || 0);
}

/**
 * Convert Decimal back to string with 2 decimal places for storage
 */
export function toMoneyString(value: Decimal | string | number): string {
  const decimal = toDecimal(value);
  return decimal.toFixed(2);
}

/**
 * Add two monetary values safely
 */
export function addMoney(a: string | number | Decimal, b: string | number | Decimal): string {
  const sum = toDecimal(a).plus(toDecimal(b));
  return toMoneyString(sum);
}

/**
 * Subtract two monetary values safely
 */
export function subtractMoney(a: string | number | Decimal, b: string | number | Decimal): string {
  const difference = toDecimal(a).minus(toDecimal(b));
  return toMoneyString(difference);
}

/**
 * Multiply monetary value by a number
 */
export function multiplyMoney(value: string | number | Decimal, multiplier: number): string {
  const product = toDecimal(value).times(multiplier);
  return toMoneyString(product);
}

/**
 * Divide monetary value by a number
 */
export function divideMoney(value: string | number | Decimal, divisor: number): string {
  const quotient = toDecimal(value).dividedBy(divisor);
  return toMoneyString(quotient);
}

/**
 * Calculate percentage of a monetary value
 */
export function percentageOf(value: string | number | Decimal, percentage: string | number): string {
  const result = toDecimal(value).times(toDecimal(percentage)).dividedBy(100);
  return toMoneyString(result);
}

/**
 * Compare two monetary values
 * Returns: -1 if a < b, 0 if a === b, 1 if a > b
 */
export function compareMoney(a: string | number | Decimal, b: string | number | Decimal): number {
  return toDecimal(a).comparedTo(toDecimal(b));
}

/**
 * Check if a monetary value is zero
 */
export function isZero(value: string | number | Decimal): boolean {
  return toDecimal(value).isZero();
}

/**
 * Check if a monetary value is positive
 */
export function isPositive(value: string | number | Decimal): boolean {
  return toDecimal(value).greaterThan(0);
}

/**
 * Check if a monetary value is negative
 */
export function isNegative(value: string | number | Decimal): boolean {
  return toDecimal(value).lessThan(0);
}

/**
 * Get the absolute value
 */
export function absoluteMoney(value: string | number | Decimal): string {
  return toMoneyString(toDecimal(value).abs());
}

/**
 * Sum an array of monetary values
 */
export function sumMoney(values: (string | number | Decimal)[]): string {
  const sum = values.reduce((acc, val) => acc.plus(toDecimal(val)), new Decimal(0));
  return toMoneyString(sum);
}

/**
 * Get max value from array
 */
export function maxMoney(...values: (string | number | Decimal)[]): string {
  if (values.length === 0) return toMoneyString(0);
  const max = values.reduce((max, val) => {
    const decimal = toDecimal(val);
    return decimal.greaterThan(max) ? decimal : max;
  }, toDecimal(values[0]));
  return toMoneyString(max);
}

/**
 * Get min value from array
 */
export function minMoney(...values: (string | number | Decimal)[]): string {
  if (values.length === 0) return toMoneyString(0);
  const min = values.reduce((min, val) => {
    const decimal = toDecimal(val);
    return decimal.lessThan(min) ? decimal : min;
  }, toDecimal(values[0]));
  return toMoneyString(min);
}
