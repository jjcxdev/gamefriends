import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");
    const includeCurrentUser = searchParams.get("include_self") === "true";

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

    console.log(`Searching for Discord ID: "${query}"`);

    // Direct query to discord_connections table
    const { data: connections, error } = await supabase
      .from("discord_connections")
      .select("user_id, discord_id, discord_username, discord_avatar")
      .eq("discord_id", query);

    console.log("Query results:", connections);

    if (error) {
      console.error("Search error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Filter out the current user if includeCurrentUser is false
    const users =
      connections
        ?.filter(
          (conn) => includeCurrentUser || conn.user_id !== session.user.id
        )
        ?.map((conn) => ({
          id: conn.user_id,
          discord_id: conn.discord_id,
          username: conn.discord_username,
          avatar: conn.discord_avatar,
          isSelf: conn.user_id === session.user.id,
        })) || [];

    console.log("Filtered users:", users);
    console.log("Current user ID:", session.user.id);

    return NextResponse.json({
      users,
      debug: {
        query,
        resultsFound: connections?.length || 0,
        resultsAfterFiltering: users.length,
        currentUserId: session.user.id,
        includeCurrentUser,
      },
    });
  } catch (error) {
    console.error("Error searching Discord users:", error);
    return NextResponse.json(
      {
        error: "Failed to search users",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
