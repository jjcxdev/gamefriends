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

    console.log(`Searching for Discord user with query: ${query}`);

    // Check if the query is a Discord ID
    const isDiscordId = /^\d+$/.test(query);

    if (isDiscordId) {
      console.log(`Query is a Discord ID: ${query}`);

      // Find user by Discord ID
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("id, discord_id")
        .eq("discord_id", query)
        .single();

      if (userError) {
        console.error("Error finding user:", userError);
        // If no user found, return empty results
        if (userError.code === "PGRST116") {
          return NextResponse.json({ users: [] });
        }
        throw userError;
      }

      if (user) {
        console.log(`Found user with ID: ${user.id}`);

        // Get Discord details from discord_connections
        const { data: discordConnection, error: connectionError } =
          await supabase
            .from("discord_connections")
            .select("discord_username, discord_avatar")
            .eq("user_id", user.id)
            .single();

        if (connectionError) {
          console.error("Error getting Discord connection:", connectionError);
        }

        // Check if this user is already a friend
        const { data: existingConnection, error: friendError } = await supabase
          .from("friend_connections")
          .select()
          .eq("user_id", session.user.id)
          .eq("friend_id", user.id)
          .maybeSingle();

        if (friendError) {
          console.error("Error checking friend connection:", friendError);
        }

        return NextResponse.json({
          users: [
            {
              id: user.id,
              discord_id: user.discord_id,
              username:
                discordConnection?.discord_username ||
                `User ${user.discord_id.slice(-4)}`,
              avatar: discordConnection?.discord_avatar,
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
      {
        error: "Failed to search Discord users",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
