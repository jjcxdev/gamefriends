import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const friendIds = searchParams.get("friendIds")?.split(",") || [];

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Fetch user's owned games
    const { data: userGames, error: userGamesError } = await supabase
      .from("user_games")
      .select("game_id")
      .eq("user_id", userId);

    if (userGamesError) {
      throw new Error("Failed to fetch user games");
    }

    // Initialize ownership data with user's games
    const ownershipData = userGames.map((game) => ({
      gameId: game.game_id,
      userId: userId,
      ownedByUser: true,
    }));

    // If there are friends to check, fetch their game ownership data
    if (friendIds.length > 0) {
      const { data: friendGames, error: friendGamesError } = await supabase
        .from("user_games")
        .select("user_id, game_id")
        .in("user_id", friendIds);

      if (friendGamesError) {
        throw new Error("Failed to fetch friend games");
      }

      friendGames.forEach((game) => {
        ownershipData.push({
          gameId: game.game_id,
          userId: game.user_id,
          ownedByUser: true,
        });
      });
    }

    return NextResponse.json({ ownerships: ownershipData });
  } catch (error) {
    console.error("Error fetching game ownership data:", error);
    return NextResponse.json(
      { error: "Failed to fetch game ownership data" },
      { status: 500 }
    );
  }
}
