import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

interface UserProfile {
  username: string;
  avatar_url: string;
}

interface RegisteredFriend {
  id: string;
  discord_id: string;
  user_profiles: UserProfile;
}

interface SupabaseFriend {
  id: string;
  discord_id: string;
  user_profiles: UserProfile[];
}

interface DiscordFriend {
  type: number;
  user: {
    id: string;
  };
}

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

    // Get the user's Discord connection info with access token
    const { data: discordConnection } = await supabase
      .from("discord_connections")
      .select("access_token")
      .eq("user_id", session.user.id)
      .single();

    if (!discordConnection?.access_token) {
      return NextResponse.json(
        { error: "No Discord connection" },
        { status: 400 }
      );
    }

    // Fetch actual Discord friends list using Discord's API
    const discordFriendsResponse = await fetch(
      "https://discord.com/api/v10/users/@me/relationships",
      {
        headers: {
          Authorization: `Bearer ${discordConnection.access_token}`,
        },
      }
    );

    if (!discordFriendsResponse.ok) {
      console.error("Discord API Error:", await discordFriendsResponse.text());
      throw new Error("Failed to fetch Discord friends");
    }

    const discordFriends = await discordFriendsResponse.json();

    // Filter to get only actual friends (type 1 in Discord's API)
    const friendDiscordIds = discordFriends
      .filter((friend: DiscordFriend) => friend.type === 1)
      .map((friend: DiscordFriend) => friend.user.id);

    if (friendDiscordIds.length === 0) {
      return NextResponse.json({ friends: [] });
    }

    // Find which Discord friends are registered in your app
    const { data: registeredFriends, error: dbError } = await supabase
      .from("users")
      .select(
        `
        id,
        discord_id,
        user_profiles (
          username,
          avatar_url
        )
      `
      )
      .in("discord_id", friendDiscordIds);

    if (dbError) throw dbError;

    // Check existing friend connections
    const { data: existingConnections } = await supabase
      .from("friend_connections")
      .select("friend_id")
      .eq("user_id", session.user.id);

    const connectedFriendIds = new Set(
      existingConnections?.map((conn) => conn.friend_id) || []
    );

    // Transform the Supabase response into the expected format
    const transformedFriends: RegisteredFriend[] = (
      (registeredFriends as SupabaseFriend[]) || []
    )
      .map((friend) => ({
        id: friend.id,
        discord_id: friend.discord_id,
        user_profiles: friend.user_profiles[0], // Take the first profile
      }))
      .filter((friend) => friend.user_profiles); // Ensure profile exists

    return NextResponse.json({
      friends: transformedFriends.map((friend) => ({
        id: friend.discord_id,
        username: friend.user_profiles.username,
        avatar: friend.user_profiles.avatar_url,
        isConnected: connectedFriendIds.has(friend.id),
      })),
    });
  } catch (error) {
    console.error("Error fetching Discord friends:", error);
    return NextResponse.json(
      { error: "Failed to fetch Discord friends" },
      { status: 500 }
    );
  }
}
