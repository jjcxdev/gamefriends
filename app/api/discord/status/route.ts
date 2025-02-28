import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ connected: false });
    }

    const { data: profile, error } = await supabase
      .from("user_profiles")
      .select("username, avatar_url")
      .eq("id", session.user.id)
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      connected: true,
      username: profile.username,
      avatar: profile.avatar_url,
    });
  } catch (error) {
    console.error("Error checking Discord status:", error);
    return NextResponse.json(
      { error: "Failed to check Discord connection status" },
      { status: 500 }
    );
  }
}
