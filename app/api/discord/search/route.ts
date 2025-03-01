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

    console.log(
      `Searching for Discord user with query: ${query}, current user: ${session.user.id}`
    );

    // First try exact match on discord_id
    const { data: idMatches, error: idError } = await supabase
      .from("discord_connections")
      .select("user_id, discord_id, discord_username, discord_avatar")
      .eq("discord_id", query);

    console.log("ID match results:", idMatches, "Error:", idError);

    // Then try username search - using a different approach
    const { data: usernameMatches, error: usernameError } = await supabase
      .from("discord_connections")
      .select("user_id, discord_id, discord_username, discord_avatar")
      .filter("discord_username", "ilike", `%${query}%`)
      .limit(10);

    console.log(
      "Username match results:",
      usernameMatches,
      "Error:",
      usernameError
    );

    if (idError || usernameError) {
      console.error("Search error:", idError || usernameError);
      return NextResponse.json(
        { error: "Database search failed" },
        { status: 500 }
      );
    }

    // Combine results, prioritizing exact ID matches
    const allMatches = [...(idMatches || []), ...(usernameMatches || [])];

    // Remove duplicates by discord_id
    const uniqueUsers = Array.from(
      new Map(allMatches.map((user) => [user.discord_id, user])).values()
    );

    // Filter out current user
    const filteredUsers = uniqueUsers.filter(
      (user) => user.user_id !== session.user.id
    );

    if (filteredUsers.length === 0) {
      console.log("No users found for query:", query);
      return NextResponse.json({ users: [] });
    }

    // Check which users are already friends
    const userIds = filteredUsers.map((user) => user.user_id);
    const { data: friendConnections } = await supabase
      .from("friend_connections")
      .select("friend_id")
      .eq("user_id", session.user.id)
      .in("friend_id", userIds);

    const friendIds = new Set(
      friendConnections?.map((fc) => fc.friend_id) || []
    );

    const result = {
      users: filteredUsers.map((user) => ({
        id: user.user_id,
        discord_id: user.discord_id,
        username: user.discord_username,
        avatar: user.discord_avatar,
        isConnected: friendIds.has(user.user_id),
      })),
    };

    console.log("Returning result:", JSON.stringify(result));
    return NextResponse.json(result);
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
