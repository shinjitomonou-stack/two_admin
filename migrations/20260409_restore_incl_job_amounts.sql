-- =============================================================================
-- 税込入力の金額を元の入力値に戻すマイグレーション
-- =============================================================================
--
-- 背景:
--   これまで jobs テーブルの reward_amount / billing_amount / reward_unit_price /
--   billing_unit_price は、税込入力時にフロントで `/ 1.1` して税抜に変換してから
--   保存していた。その結果、例えばユーザーが「税込6000円」と入力しても
--   DB には 5455 が保存され、再表示時に Math.round(5455 * 1.1) = 6001 と
--   1円ズレる問題があった。
--
-- 方針変更:
--   今後は「入力された値そのまま」を DB に保存し、tax_mode で税抜/税込を区別する。
--   lib/tax.ts のヘルパー（toExcl / toIncl）が集計・表示時に変換を行う。
--
-- このマイグレーションの役割:
--   既存データのうち `reward_tax_mode = 'INCL'` / `billing_tax_mode = 'INCL'` の
--   レコードは `/ 1.1` 済みの税抜値が入っているので、`round(amount * 1.1)` で
--   元の税込入力値に戻す。
--
-- 注意: 四捨五入の性質上、完全な復元にはならないケースがあるが
--       大多数のケースでは元の入力値に戻る。
-- =============================================================================

BEGIN;

-- reward 側: INCL で保存されていた案件を元に戻す
UPDATE public.jobs
SET
    reward_amount = ROUND(reward_amount * 1.1),
    reward_unit_price = CASE
        WHEN reward_unit_price IS NOT NULL THEN ROUND(reward_unit_price * 1.1)
        ELSE NULL
    END
WHERE reward_tax_mode = 'INCL';

-- billing 側: INCL で保存されていた案件を元に戻す
UPDATE public.jobs
SET
    billing_amount = CASE
        WHEN billing_amount IS NOT NULL THEN ROUND(billing_amount * 1.1)
        ELSE NULL
    END,
    billing_unit_price = CASE
        WHEN billing_unit_price IS NOT NULL THEN ROUND(billing_unit_price * 1.1)
        ELSE NULL
    END
WHERE billing_tax_mode = 'INCL';

COMMIT;
