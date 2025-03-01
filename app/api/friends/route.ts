import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get the user's friends from your database
    const { data: friendConnections, error: connectionsError } = await supabase
      .from("friend_connections")
      .select("friend_id")
      .eq("user_id", session.user.id);

    if (connectionsError) {
      console.error("Error fetching friend connections:", connectionsError);
      return NextResponse.json(
        { error: "Failed to fetch friend connections" },
        { status: 500 }
      );
    }

    if (!friendConnections || friendConnections.length === 0) {
      return NextResponse.json({ friends: [] });
    }

    const friendIds = friendConnections.map((fc) => fc.friend_id);

    // Get friend details
    const { data: friends, error: friendsError } = await supabase
      .from("users")
      .select(
        `
        id,
        discord_id,
        discord_connections (
          discord_username,
          discord_avatar
        )
      `
      )
      .in("id", friendIds);

    if (friendsError) {
      console.error("Error fetching friends:", friendsError);
      return NextResponse.json(
        { error: "Failed to fetch friends" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      friends: (friends || []).map((friend) => ({
        id: friend.id,
        discord_id: friend.discord_id,
        username:
          friend.discord_connections?.[0]?.discord_username || "Unknown",
        avatar: friend.discord_connections?.[0]?.discord_avatar || null,
        isConnected: true,
      })),
    });
  } catch (error) {
    console.error("Error fetching friends:", error);
    return NextResponse.json(
      { error: "Failed to fetch friends" },
      { status: 500 }
    );
  }
}
