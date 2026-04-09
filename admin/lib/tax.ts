/**
 * 消費税計算ヘルパー
 *
 * 方針:
 * - DBには「ユーザーが入力した金額そのまま」を保存する
 * - `tax_mode` ('EXCL' | 'INCL') で税抜/税込を区別する
 * - 表示・集計時はこのヘルパーを通して変換する
 *
 * これにより「入力した金額が丸め誤差で1円ずれる」問題を防ぐ。
 */

export type TaxMode = "EXCL" | "INCL";

const TAX_RATE = 0.1;

/** 税抜金額に変換 */
export const toExcl = (amount: number, mode: TaxMode): number => {
  if (mode === "EXCL") return amount;
  // 税込 → 税抜: 税込 - 税額
  return amount - Math.round((amount * 10) / 110);
};

/** 税込金額に変換 */
export const toIncl = (amount: number, mode: TaxMode): number => {
  if (mode === "INCL") return amount;
  // 税抜 → 税込: 税抜 + 税額
  return amount + Math.round(amount * TAX_RATE);
};

/** 消費税額を返す */
export const taxOf = (amount: number, mode: TaxMode): number => {
  return toIncl(amount, mode) - toExcl(amount, mode);
};

/**
 * 複数金額の税抜合計
 * 各金額を個別に税抜変換してから加算するので、
 * 明細行ごとの税抜表示合計と一致する。
 */
export const sumExcl = (
  items: Array<{ amount: number; mode: TaxMode }>
): number => items.reduce((s, i) => s + toExcl(i.amount, i.mode), 0);

/**
 * 複数金額の税込合計
 * 各金額を個別に税込変換してから加算するので、
 * 明細行ごとの税込表示合計と一致する。
 */
export const sumIncl = (
  items: Array<{ amount: number; mode: TaxMode }>
): number => items.reduce((s, i) => s + toIncl(i.amount, i.mode), 0);

/** 複数金額の消費税合計 */
export const sumTax = (
  items: Array<{ amount: number; mode: TaxMode }>
): number => sumIncl(items) - sumExcl(items);
