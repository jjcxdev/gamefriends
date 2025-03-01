import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");

    if (!query) {
      return NextResponse.json(
        { error: "Search query is required" },
        { status: 400 }
      );
    }

    // Get the user's session
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Check if the query is a Discord ID
    const isDiscordId = /^\d+$/.test(query);

    if (isDiscordId) {
      // Try to find the user by Discord ID
      const { data: user } = await supabase
        .from("users")
        .select("id, discord_id")
        .eq("discord_id", query)
        .single();

      if (user) {
        // Get Discord user details using your existing API
        const response = await fetch(
          `${request.headers.get("origin")}/api/discord/user?id=${
            user.discord_id
          }`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch Discord user details");
        }

        const discordUser = await response.json();

        // Check if this user is already a friend
        const { data: existingConnection } = await supabase
          .from("friend_connections")
          .select()
          .eq("user_id", session.user.id)
          .eq("friend_id", user.id)
          .maybeSingle();

        return NextResponse.json({
          users: [
            {
              id: user.id,
              discord_id: user.discord_id,
              username: discordUser.username,
              avatar: discordUser.avatar,
              isConnected: !!existingConnection,
            },
          ],
        });
      }
    }

    // If no user found or query isn't a Discord ID
    return NextResponse.json({ users: [] });
  } catch (error) {
    console.error("Error searching Discord users:", error);
    return NextResponse.json(
      { error: "Failed to search Discord users" },
      { status: 500 }
    );
  }
}
