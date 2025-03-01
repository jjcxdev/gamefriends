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

    // First, try a direct match on discord_id
    const directMatchResult = await supabase
      .from("discord_connections")
      .select(
        `
        user_id,
        discord_id,
        discord_username,
        discord_avatar
      `
      )
      .eq("discord_id", query)
      .neq("user_id", session.user.id);

    console.log(
      "Direct match result:",
      directMatchResult.data,
      "Error:",
      directMatchResult.error
    );

    // Initialize users variable
    let users = directMatchResult.data || [];

    // If no direct match, try the username search
    if (users.length === 0) {
      const usernameMatchResult = await supabase
        .from("discord_connections")
        .select(
          `
          user_id,
          discord_id,
          discord_username,
          discord_avatar
        `
        )
        .ilike("discord_username", `%${query}%`)
        .neq("user_id", session.user.id)
        .limit(10);

      console.log(
        "Username match result:",
        usernameMatchResult.data,
        "Error:",
        usernameMatchResult.error
      );

      if (usernameMatchResult.error) {
        console.error(
          "Error searching by username:",
          usernameMatchResult.error
        );
        return NextResponse.json(
          { error: "Failed to search users by username" },
          { status: 500 }
        );
      }

      users = usernameMatchResult.data || [];
    }

    if (users.length === 0) {
      console.log("No users found for query:", query);
      return NextResponse.json({ users: [] });
    }

    // Check which users are already friends
    const userIds = users.map((user) => user.user_id);
    const friendResult = await supabase
      .from("friend_connections")
      .select("friend_id")
      .eq("user_id", session.user.id)
      .in("friend_id", userIds);

    console.log(
      "Friend connections:",
      friendResult.data,
      "Error:",
      friendResult.error
    );

    const friendIds = new Set(
      friendResult.data?.map((fc) => fc.friend_id) || []
    );

    const result = {
      users: users.map((user) => ({
        id: user.user_id,
        discord_id: user.discord_id,
        username: user.discord_username,
        avatar: user.discord_avatar,
        isConnected: friendIds.has(user.user_id),
      })),
    };

    console.log("Returning result:", result);
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
