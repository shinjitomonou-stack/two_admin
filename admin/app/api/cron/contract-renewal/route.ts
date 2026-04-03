import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { sendSlackNotification } from "@/lib/slack";

export const dynamic = "force-dynamic";

/**
 * Calculate new end_date based on billing_cycle.
 * Handles month-end clamping (e.g., 1/31 + 1 month = 2/28).
 */
function calculateNewEndDate(currentEndDate: string, billingCycle: string): string {
  const [year, month, day] = currentEndDate.split("-").map(Number);

  let newYear = year;
  let newMonth = month;

  switch (billingCycle) {
    case "MONTHLY":
      newMonth += 1;
      break;
    case "QUARTERLY":
      newMonth += 3;
      break;
    case "YEARLY":
      newYear += 1;
      break;
    default:
      throw new Error(`Unsupported billing cycle: ${billingCycle}`);
  }

  // Handle month overflow
  while (newMonth > 12) {
    newMonth -= 12;
    newYear += 1;
  }

  // Clamp day to last day of target month
  const lastDayOfMonth = new Date(newYear, newMonth, 0).getDate();
  const clampedDay = Math.min(day, lastDayOfMonth);

  const y = String(newYear);
  const m = String(newMonth).padStart(2, "0");
  const d = String(clampedDay).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

/**
 * Get today's date string in JST (YYYY-MM-DD).
 */
function getJSTToday(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(now);
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

/**
 * Get a date string N days from today in JST (YYYY-MM-DD).
 */
function getJSTDateOffset(offsetDays: number): string {
  const today = getJSTToday();
  const date = new Date(`${today}T00:00:00+09:00`);
  date.setDate(date.getDate() + offsetDays);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function GET(request: Request) {
  // Authenticate cron request
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const today = getJSTToday();
  const in14Days = getJSTDateOffset(14);

  const results = {
    notified: 0,
    renewed: 0,
    expired: 0,
    errors: [] as string[],
  };

  // ============================================================
  // 1. 14-day advance notification
  // ============================================================
  try {
    const [basicRes, individualRes] = await Promise.all([
      supabase
        .from("client_contracts")
        .select("id, title, end_date, billing_cycle, clients(name)")
        .eq("end_date", in14Days)
        .eq("auto_renew", true)
        .eq("status", "ACTIVE"),
      supabase
        .from("client_job_contracts")
        .select("id, title, end_date, billing_cycle, clients(name)")
        .eq("end_date", in14Days)
        .eq("is_auto_renew", true)
        .eq("status", "ACTIVE"),
    ]);

    const basicContracts = basicRes.data || [];
    const individualContracts = individualRes.data || [];
    const totalNotify = basicContracts.length + individualContracts.length;

    if (totalNotify > 0) {
      const lines: string[] = [];
      lines.push("<!here> :bell: *契約自動更新の事前通知*\n");
      lines.push(`以下の契約が *14日後（${in14Days}）* に自動更新されます。`);
      lines.push("停止する場合は管理画面から自動更新をOFFにしてください。\n");

      if (basicContracts.length > 0) {
        lines.push("*基本契約 / NDA:*");
        for (const c of basicContracts) {
          // @ts-ignore
          const clientName = c.clients?.name || "不明";
          lines.push(`  - ${clientName} - ${c.title}（終了日: ${c.end_date}）`);
        }
      }

      if (individualContracts.length > 0) {
        lines.push("*個別契約:*");
        for (const c of individualContracts) {
          // @ts-ignore
          const clientName = c.clients?.name || "不明";
          lines.push(`  - ${clientName} - ${c.title}（終了日: ${c.end_date}）`);
        }
      }

      await sendSlackNotification(lines.join("\n"));
      results.notified = totalNotify;
    }
  } catch (error) {
    results.errors.push(`Notification error: ${error}`);
  }

  // ============================================================
  // 2. Auto-renewal: end_date <= today & auto_renew = true
  // ============================================================
  try {
    // Check for already-processed renewals today (idempotency)
    const { data: todayRenewals } = await supabase
      .from("contract_renewals")
      .select("contract_table, contract_id")
      .gte("created_at", `${today}T00:00:00+09:00`)
      .lt("created_at", `${getJSTDateOffset(1)}T00:00:00+09:00`)
      .eq("renewal_type", "AUTO_RENEWED");

    const alreadyRenewed = new Set(
      (todayRenewals || []).map((r) => `${r.contract_table}:${r.contract_id}`)
    );

    // client_contracts
    const { data: basicToRenew } = await supabase
      .from("client_contracts")
      .select("id, end_date, billing_cycle, title, clients(name)")
      .lte("end_date", today)
      .eq("auto_renew", true)
      .eq("status", "ACTIVE")
      .not("end_date", "is", null)
      .in("billing_cycle", ["MONTHLY", "QUARTERLY", "YEARLY"]);

    for (const c of basicToRenew || []) {
      if (alreadyRenewed.has(`client_contracts:${c.id}`)) continue;

      const newEndDate = calculateNewEndDate(c.end_date, c.billing_cycle);
      const { error } = await supabase
        .from("client_contracts")
        .update({ end_date: newEndDate })
        .eq("id", c.id);

      if (error) {
        results.errors.push(`Failed to renew client_contracts ${c.id}: ${error.message}`);
        continue;
      }

      await supabase.from("contract_renewals").insert({
        contract_table: "client_contracts",
        contract_id: c.id,
        previous_end_date: c.end_date,
        new_end_date: newEndDate,
        billing_cycle: c.billing_cycle,
        renewal_type: "AUTO_RENEWED",
      });

      results.renewed++;
    }

    // client_job_contracts
    const { data: individualToRenew } = await supabase
      .from("client_job_contracts")
      .select("id, end_date, billing_cycle, title, clients(name)")
      .lte("end_date", today)
      .eq("is_auto_renew", true)
      .eq("status", "ACTIVE")
      .not("end_date", "is", null)
      .in("billing_cycle", ["MONTHLY", "QUARTERLY", "YEARLY"]);

    for (const c of individualToRenew || []) {
      if (alreadyRenewed.has(`client_job_contracts:${c.id}`)) continue;

      const newEndDate = calculateNewEndDate(c.end_date, c.billing_cycle);
      const { error } = await supabase
        .from("client_job_contracts")
        .update({ end_date: newEndDate })
        .eq("id", c.id);

      if (error) {
        results.errors.push(`Failed to renew client_job_contracts ${c.id}: ${error.message}`);
        continue;
      }

      await supabase.from("contract_renewals").insert({
        contract_table: "client_job_contracts",
        contract_id: c.id,
        previous_end_date: c.end_date,
        new_end_date: newEndDate,
        billing_cycle: c.billing_cycle,
        renewal_type: "AUTO_RENEWED",
      });

      results.renewed++;
    }
  } catch (error) {
    results.errors.push(`Renewal error: ${error}`);
  }

  // ============================================================
  // 3. Expiration: end_date <= today & auto_renew = false
  // ============================================================
  try {
    // Check for already-processed expirations today (idempotency)
    const { data: todayExpirations } = await supabase
      .from("contract_renewals")
      .select("contract_table, contract_id")
      .gte("created_at", `${today}T00:00:00+09:00`)
      .lt("created_at", `${getJSTDateOffset(1)}T00:00:00+09:00`)
      .eq("renewal_type", "EXPIRED");

    const alreadyExpired = new Set(
      (todayExpirations || []).map((r) => `${r.contract_table}:${r.contract_id}`)
    );

    // client_contracts
    const { data: basicToExpire } = await supabase
      .from("client_contracts")
      .select("id, end_date, billing_cycle, title, clients(name)")
      .lte("end_date", today)
      .eq("auto_renew", false)
      .eq("status", "ACTIVE")
      .not("end_date", "is", null);

    for (const c of basicToExpire || []) {
      if (alreadyExpired.has(`client_contracts:${c.id}`)) continue;

      const { error } = await supabase
        .from("client_contracts")
        .update({ status: "EXPIRED" })
        .eq("id", c.id);

      if (error) {
        results.errors.push(`Failed to expire client_contracts ${c.id}: ${error.message}`);
        continue;
      }

      await supabase.from("contract_renewals").insert({
        contract_table: "client_contracts",
        contract_id: c.id,
        previous_end_date: c.end_date,
        new_end_date: c.end_date,
        billing_cycle: c.billing_cycle || "UNKNOWN",
        renewal_type: "EXPIRED",
      });

      results.expired++;
    }

    // client_job_contracts
    const { data: individualToExpire } = await supabase
      .from("client_job_contracts")
      .select("id, end_date, billing_cycle, title, clients(name)")
      .lte("end_date", today)
      .eq("is_auto_renew", false)
      .eq("status", "ACTIVE")
      .not("end_date", "is", null);

    for (const c of individualToExpire || []) {
      if (alreadyExpired.has(`client_job_contracts:${c.id}`)) continue;

      const { error } = await supabase
        .from("client_job_contracts")
        .update({ status: "EXPIRED" })
        .eq("id", c.id);

      if (error) {
        results.errors.push(`Failed to expire client_job_contracts ${c.id}: ${error.message}`);
        continue;
      }

      await supabase.from("contract_renewals").insert({
        contract_table: "client_job_contracts",
        contract_id: c.id,
        previous_end_date: c.end_date,
        new_end_date: c.end_date,
        billing_cycle: c.billing_cycle || "UNKNOWN",
        renewal_type: "EXPIRED",
      });

      results.expired++;
    }
  } catch (error) {
    results.errors.push(`Expiration error: ${error}`);
  }

  // ============================================================
  // 4. Log summary
  // ============================================================
  console.log(`[contract-renewal] ${today}: notified=${results.notified}, renewed=${results.renewed}, expired=${results.expired}, errors=${results.errors.length}`);

  return NextResponse.json({
    success: results.errors.length === 0,
    date: today,
    ...results,
  });
}
