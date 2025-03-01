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
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get the user's Discord connection
    const { data: connection, error } = await supabase
      .from("discord_connections")
      .select("*")
      .eq("user_id", session.user.id)
      .single();

    if (error) {
      return NextResponse.json(
        {
          error: "Error fetching Discord connection",
          details: error,
        },
        { status: 500 }
      );
    }

    // Get the user record
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", session.user.id)
      .single();

    if (userError) {
      return NextResponse.json(
        {
          error: "Error fetching user",
          details: userError,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      user,
      connection,
      tables: {
        users: await supabase.from("users").select("id, discord_id").limit(5),
        discord_connections: await supabase
          .from("discord_connections")
          .select("user_id, discord_id, discord_username")
          .limit(5),
      },
    });
  } catch (error) {
    console.error("Debug error:", error);
    return NextResponse.json({ error: "Debug failed" }, { status: 500 });
  }
}
