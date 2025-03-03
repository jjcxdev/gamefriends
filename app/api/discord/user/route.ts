import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getDiscordAvatarUrl } from "@/utils/discord";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const discordId = searchParams.get("id");

  if (!discordId) {
    return NextResponse.json(
      { error: "Discord ID is required" },
      { status: 400 }
    );
  }

  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  try {
    // Get user data directly from discord_connections table
    const { data: discordConnection } = await supabase
      .from("discord_connections")
      .select("discord_username, discord_avatar")
      .eq("discord_id", discordId)
      .single();

    if (discordConnection) {
      // If we have the data in our database, return it
      return NextResponse.json({
        username: discordConnection.discord_username,
        avatar: discordConnection.discord_avatar,
      });
    }

    // If not in our database, fall back to Discord API via bot
    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
      console.error("DISCORD_BOT_TOKEN is not set in environment variables");
      return NextResponse.json(
        {
          error: "Discord bot configuration error",
          details: "Bot token not configured",
        },
        { status: 500 }
      );
    }

    // Fetch user data from Discord API
    const response = await fetch(
      `https://discord.com/api/v10/users/${discordId}`,
      {
        headers: {
          Authorization: `Bot ${botToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Discord API error: ${response.status} - ${errorText}`);
      return NextResponse.json(
        { error: "Failed to fetch Discord user data" },
        { status: response.status }
      );
    }

    const discordUser = await response.json();

    // Return the user data
    return NextResponse.json({
      username: discordUser.username,
      avatar: getDiscordAvatarUrl(discordId, discordUser.avatar),
    });
  } catch (error) {
    console.error("Error fetching Discord user:", error);
    return NextResponse.json(
      { error: "Failed to fetch Discord user data" },
      { status: 500 }
    );
  }
}
