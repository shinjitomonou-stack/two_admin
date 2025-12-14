import AdminLayout from "@/components/layout/AdminLayout";
import { ArrowLeft, Download, FileText, Calendar, Building2, User, DollarSign, Briefcase } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { formatDate } from "@/lib/utils";
import StatusChanger from "@/components/StatusChanger";
import ContractNotificationButton from "@/components/contracts/ContractNotificationButton";

export default async function IndividualContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    // DEBUG: Return simple response to test routing
    return (
        <AdminLayout>
            <div className="p-8">
                <h1 className="text-2xl font-bold text-green-600">Routing Works!</h1>
                <p>Contract ID: {id}</p>
                <p className="text-sm text-gray-500 mt-4">Data fetching is temporarily disabled for debugging.</p>
            </div>
        </AdminLayout>
    );
}

/*
    const supabase = await createClient();

    const { data: contract, error } = await supabase
        .from("client_job_contracts")
// ... content ...
    return (
        <AdminLayout>
            <div className="space-y-6 max-w-5xl mx-auto">
// ... content ...
            </div>
        </AdminLayout>
    );
}
*/
