import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Fetch user's friends
    const { data: friendConnections, error: friendsError } = await supabase
      .from("friend_connections")
      .select("friend_id")
      .eq("user_id", userId);

    if (friendsError) {
      throw new Error("Failed to fetch friend connections");
    }

    if (friendConnections.length === 0) {
      return NextResponse.json({ friends: [] });
    }

    // Get friend IDs
    const friendIds = friendConnections.map(
      (connection) => connection.friend_id
    );

    // Fetch friend profiles
    const { data: friendProfiles, error: profilesError } = await supabase
      .from("user_profiles")
      .select("id, username, avatar_url")
      .in("id", friendIds);

    if (profilesError) {
      throw new Error("Failed to fetch friend profiles");
    }

    // Format the response
    const friends = friendProfiles.map((profile) => ({
      id: profile.id,
      name: profile.username,
      avatar: profile.avatar_url,
    }));

    return NextResponse.json({ friends });
  } catch (error) {
    console.error("Error fetching friends:", error);
    return NextResponse.json(
      { error: "Failed to fetch friends" },
      { status: 500 }
    );
  }
}
