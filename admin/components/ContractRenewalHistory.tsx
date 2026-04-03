import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils";
import { RefreshCw } from "lucide-react";

type ContractTable = "client_contracts" | "client_job_contracts";

interface ContractRenewalHistoryProps {
  contractId: string;
  contractTable: ContractTable;
}

const renewalTypeLabels: Record<string, string> = {
  AUTO_RENEWED: "自動更新",
  EXPIRED: "期限切れ",
};

const billingCycleLabels: Record<string, string> = {
  MONTHLY: "月次",
  QUARTERLY: "四半期",
  YEARLY: "年次",
  UNKNOWN: "-",
};

export default async function ContractRenewalHistory({
  contractId,
  contractTable,
}: ContractRenewalHistoryProps) {
  const supabase = await createClient();

  const { data: renewals } = await supabase
    .from("contract_renewals")
    .select("*")
    .eq("contract_table", contractTable)
    .eq("contract_id", contractId)
    .order("created_at", { ascending: false });

  if (!renewals || renewals.length === 0) {
    return null;
  }

  return (
    <div className="bg-white p-6 rounded-xl border border-border shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <RefreshCw className="w-5 h-5 text-slate-400" />
        <h3 className="font-bold text-lg">更新履歴</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="py-2 pr-4 text-muted-foreground font-medium">日時</th>
              <th className="py-2 pr-4 text-muted-foreground font-medium">種別</th>
              <th className="py-2 pr-4 text-muted-foreground font-medium">旧終了日</th>
              <th className="py-2 pr-4 text-muted-foreground font-medium">新終了日</th>
              <th className="py-2 text-muted-foreground font-medium">請求サイクル</th>
            </tr>
          </thead>
          <tbody>
            {renewals.map((r) => (
              <tr key={r.id} className="border-b border-border last:border-0">
                <td className="py-2 pr-4">{formatDateTime(r.created_at)}</td>
                <td className="py-2 pr-4">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      r.renewal_type === "AUTO_RENEWED"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {renewalTypeLabels[r.renewal_type] || r.renewal_type}
                  </span>
                </td>
                <td className="py-2 pr-4">{r.previous_end_date}</td>
                <td className="py-2 pr-4">{r.new_end_date}</td>
                <td className="py-2">
                  {billingCycleLabels[r.billing_cycle] || r.billing_cycle}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
