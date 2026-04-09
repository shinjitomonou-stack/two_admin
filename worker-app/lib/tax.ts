/**
 * 消費税計算ヘルパー (worker-app)
 *
 * admin/lib/tax.ts と同一ロジック。
 * DBには入力値そのまま保存、tax_mode で区別する方針。
 */

export type TaxMode = "EXCL" | "INCL";

const TAX_RATE = 0.1;

export const toExcl = (amount: number, mode: TaxMode): number => {
  if (mode === "EXCL") return amount;
  return amount - Math.round((amount * 10) / 110);
};

export const toIncl = (amount: number, mode: TaxMode): number => {
  if (mode === "INCL") return amount;
  return amount + Math.round(amount * TAX_RATE);
};

export const taxOf = (amount: number, mode: TaxMode): number => {
  return toIncl(amount, mode) - toExcl(amount, mode);
};

export const sumExcl = (
  items: Array<{ amount: number; mode: TaxMode }>
): number => items.reduce((s, i) => s + toExcl(i.amount, i.mode), 0);

export const sumIncl = (
  items: Array<{ amount: number; mode: TaxMode }>
): number => items.reduce((s, i) => s + toIncl(i.amount, i.mode), 0);

export const sumTax = (
  items: Array<{ amount: number; mode: TaxMode }>
): number => sumIncl(items) - sumExcl(items);
