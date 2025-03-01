import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function POST() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get the user's Discord ID
    const { data: user } = await supabase
      .from("users")
      .select("discord_id")
      .eq("id", session.user.id)
      .single();

    if (!user?.discord_id) {
      return NextResponse.json(
        { error: "No Discord connection" },
        { status: 400 }
      );
    }

    // Use bot token to fetch updated user data
    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json(
        { error: "Bot token not configured" },
        { status: 500 }
      );
    }

    const response = await fetch(
      `https://discord.com/api/v10/users/${user.discord_id}`,
      {
        headers: {
          Authorization: `Bot ${botToken}`,
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch Discord user data" },
        { status: response.status }
      );
    }

    const discordUser = await response.json();

    // Update the user's Discord data
    await supabase.from("discord_connections").upsert(
      {
        user_id: session.user.id,
        discord_id: user.discord_id,
        discord_username: discordUser.username,
        discord_avatar: discordUser.avatar,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id",
      }
    );

    return NextResponse.json({
      success: true,
      username: discordUser.username,
      avatar: discordUser.avatar,
    });
  } catch (error) {
    console.error("Error updating Discord profile:", error);
    return NextResponse.json(
      { error: "Failed to update Discord profile" },
      { status: 500 }
    );
  }
}
