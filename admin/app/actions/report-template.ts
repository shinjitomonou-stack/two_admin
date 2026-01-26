"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { verifyAdmin } from "@/lib/auth";

export async function updateReportTemplateAction(id: string, payload: {
    name: string;
    description: string;
    fields: any[];
}) {
    await verifyAdmin();
    const supabase = await createClient();

    try {
        const { data, error } = await supabase
            .from("report_templates")
            .update({
                name: payload.name,
                description: payload.description,
                fields: payload.fields,
                updated_at: new Date().toISOString()
            })
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;

        revalidatePath("/report-templates");
        revalidatePath(`/report-templates/${id}`);
        revalidatePath(`/report-templates/${id}/edit`);

        return { success: true, data };
    } catch (error: any) {
        console.error("Error updating report template:", error);
        return { success: false, error: error.message };
    }
}

export async function deleteReportTemplateAction(id: string) {
    await verifyAdmin();
    const supabase = await createClient();

    try {
        // Soft delete
        const { error } = await supabase
            .from("report_templates")
            .update({ is_active: false })
            .eq("id", id);

        if (error) throw error;

        revalidatePath("/report-templates");
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting report template:", error);
        return { success: false, error: error.message };
    }
}
