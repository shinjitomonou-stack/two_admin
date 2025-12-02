import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const LINE_CHANNEL_ID = process.env.LINE_CHANNEL_ID || '2006927485';
const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || 'bd2af8603cadd17d4bf62c0f64dde0e8';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    // Construct origin from Host header to handle Docker port mapping correctly
    const host = request.headers.get('host') || 'localhost:3001';
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const origin = `${protocol}://${host}`;

    if (!code) {
        return NextResponse.redirect(`${origin}/settings/line?error=no_code`);
    }

    try {
        // Exchange code for access token
        const tokenResponse = await fetch('https://api.line.me/oauth2/v2.1/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: `${origin}/api/auth/line/callback`,
                client_id: LINE_CHANNEL_ID,
                client_secret: LINE_CHANNEL_SECRET,
            }),
        });

        if (!tokenResponse.ok) {
            const error = await tokenResponse.text();
            console.error('Token exchange failed:', error);
            return NextResponse.redirect(`${origin}/settings/line?error=token_failed`);
        }

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;

        // Get user profile
        const profileResponse = await fetch('https://api.line.me/v2/profile', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        if (!profileResponse.ok) {
            console.error('Profile fetch failed');
            return NextResponse.redirect(`${origin}/settings/line?error=profile_failed`);
        }

        const profile = await profileResponse.json();
        const lineUserId = profile.userId;

        // Get authenticated user from Supabase Auth
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.redirect(`${origin}/login`);
        }

        const { error: updateError } = await supabase
            .from('workers')
            .update({ line_user_id: lineUserId })
            .eq('id', user.id);

        if (updateError) {
            console.error('Database update failed:', updateError);
            return NextResponse.redirect(`${origin}/settings/line?error=db_failed`);
        }

        return NextResponse.redirect(`${origin}/settings/line?success=true`);
    } catch (error) {
        console.error('LINE callback error:', error);
        return NextResponse.redirect(`${origin}/settings/line?error=unknown`);
    }
}
