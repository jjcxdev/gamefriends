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

    // Search directly in discord_connections table
    const { data: users, error: searchError } = await supabase
      .from("discord_connections")
      .select(
        `
        user_id,
        discord_id,
        discord_username,
        discord_avatar
      `
      )
      .or(`discord_username.ilike.%${query}%,discord_id.eq.${query}`)
      .neq("user_id", session.user.id) // Don't include the current user
      .limit(10);

    if (searchError) {
      console.error("Error searching users:", searchError);
      return NextResponse.json(
        { error: "Failed to search users" },
        { status: 500 }
      );
    }

    if (!users || users.length === 0) {
      return NextResponse.json({ users: [] });
    }

    // Check which users are already friends
    const userIds = users.map((user) => user.user_id);
    const { data: friendConnections } = await supabase
      .from("friend_connections")
      .select("friend_id")
      .eq("user_id", session.user.id)
      .in("friend_id", userIds);

    const friendIds = new Set(
      friendConnections?.map((fc) => fc.friend_id) || []
    );

    return NextResponse.json({
      users: users.map((user) => ({
        id: user.user_id,
        discord_id: user.discord_id,
        username: user.discord_username,
        avatar: user.discord_avatar,
        isConnected: friendIds.has(user.user_id),
      })),
    });
  } catch (error) {
    console.error("Error searching Discord users:", error);
    return NextResponse.json(
      { error: "Failed to search users" },
      { status: 500 }
    );
  }
}
