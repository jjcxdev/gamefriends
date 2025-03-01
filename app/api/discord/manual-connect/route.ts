import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get the user's Discord ID from the users table
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("discord_id")
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

    if (!user.discord_id) {
      return NextResponse.json(
        {
          error: "No Discord ID found for user",
        },
        { status: 400 }
      );
    }

    // Use bot token to fetch Discord user data
    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json(
        {
          error: "Bot token not configured",
        },
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
        {
          error: "Failed to fetch Discord user data",
          status: response.status,
          text: await response.text(),
        },
        { status: response.status }
      );
    }

    const discordUser = await response.json();

    // Manually insert the Discord connection
    const { error: insertError } = await supabase
      .from("discord_connections")
      .upsert(
        {
          user_id: session.user.id,
          discord_id: user.discord_id,
          discord_username: discordUser.username || "Unknown",
          discord_avatar: discordUser.avatar || null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      );

    if (insertError) {
      return NextResponse.json(
        {
          error: "Error inserting Discord connection",
          details: insertError,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Discord connection created successfully",
      user_id: session.user.id,
      discord_id: user.discord_id,
      discord_username: discordUser.username,
      discord_avatar: discordUser.avatar,
    });
  } catch (error) {
    console.error("Error in manual connect:", error);
    return NextResponse.json(
      {
        error: "Failed to manually connect Discord account",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
