import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { parse } from 'csv-parse/sync';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'ファイルが選択されていません' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const csvContent = buffer.toString('utf-8');

        // Parse CSV
        const records = parse(csvContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
        });

        const supabase = await createClient();
        let successCount = 0;
        let failCount = 0;
        let skippedCount = 0;

        // Allowed columns to update
        const allowedColumns = [
            'full_name',
            'name_kana',
            'phone',
            'postal_code',
            'address',
            'gender',
            'birth_date',
            'rank',
            'is_verified',
            'line_id',
            'line_name',
            'schedule_notes',
            'max_workers',
        ];

        for (const record of records) {
            const email = record.email;

            if (!email) {
                skippedCount++;
                continue;
            }

            // Check if worker exists
            const { data: worker } = await supabase
                .from('workers')
                .select('id')
                .eq('email', email)
                .single();

            if (!worker) {
                skippedCount++; // Skip if not found (no create)
                continue;
            }

            // Prepare update data
            const updateData: any = {};
            let hasUpdates = false;

            for (const [key, value] of Object.entries(record)) {
                if (allowedColumns.includes(key) && key !== 'email') {
                    // Empty string -> null (as per user request)
                    if (value === '' || value === undefined || value === null) {
                        updateData[key] = null;
                        hasUpdates = true;
                    } else {
                        updateData[key] = value;
                        hasUpdates = true;
                    }
                }
            }

            if (hasUpdates) {
                const { error } = await supabase
                    .from('workers')
                    .update(updateData)
                    .eq('id', worker.id);

                if (error) {
                    console.error(`Error updating worker ${email}:`, error);
                    failCount++;
                } else {
                    successCount++;
                }
            } else {
                skippedCount++;
            }
        }

        return NextResponse.json({
            message: 'インポート処理が完了しました',
            successCount,
            failCount,
            skippedCount
        });

    } catch (error) {
        console.error('Import error:', error);
        return NextResponse.json(
            { error: 'インポート処理中にエラーが発生しました: ' + (error as Error).message },
            { status: 500 }
        );
    }
}
