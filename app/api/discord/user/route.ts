import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const discordId = searchParams.get("id");

  if (!discordId) {
    return NextResponse.json(
      { error: "Discord ID is required" },
      { status: 400 }
    );
  }

  // First get the user's UUID from our database
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: dbUser } = await supabase
    .from("users")
    .select("id")
    .eq("discord_id", discordId)
    .single();

  if (!dbUser) {
    return NextResponse.json(
      { error: "User not found in database" },
      { status: 404 }
    );
  }

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

  try {
    console.log(`Fetching Discord user: ${discordId}`);
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
      console.error("Discord API error:", {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      throw new Error(
        `Discord API error: ${response.status} ${response.statusText}`
      );
    }

    const userData = await response.json();

    // Get the appropriate avatar URL
    let avatarUrl = null;
    if (userData.avatar) {
      // Custom avatar
      avatarUrl = `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png`;
    } else {
      // Default avatar
      const defaultAvatarNumber = parseInt(userData.discriminator) % 5;
      avatarUrl = `https://cdn.discordapp.com/embed/avatars/${defaultAvatarNumber}.png`;
    }

    return NextResponse.json({
      id: dbUser.id, // Return the UUID instead of Discord ID
      discord_id: userData.id,
      username: userData.username,
      avatar: avatarUrl,
    });
  } catch (error) {
    console.error("Error fetching Discord user:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch Discord user",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
