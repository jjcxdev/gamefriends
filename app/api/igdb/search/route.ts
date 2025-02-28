import { NextResponse } from "next/server";

// IGDB API credentials
const IGDB_CLIENT_ID = process.env.NEXT_PUBLIC_IGDN_CLIENT_ID;
const IGDB_CLIENT_SECRET = process.env.NEXT_PUBLIC_IGDN_CLIENT_SECRET;

interface IGDBGameResponse {
  id: number;
  name: string;
  cover?: {
    url: string;
  };
  platforms?: Array<{ name: string }>;
  first_release_date?: number;
}

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");

    if (!query) {
      return NextResponse.json(
        { error: "Search query is required" },
        { status: 400 }
      );
    }

    // Get access token for IGDB
    const tokenResponse = await fetch(
      `https://id.twitch.tv/oauth2/token?client_id=${IGDB_CLIENT_ID}&client_secret=${IGDB_CLIENT_SECRET}&grant_type=client_credentials`,
      {
        method: "POST",
      }
    );

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Search games from IGDB
    const igdbResponse = await fetch("https://api.igdb.com/v4/games", {
      method: "POST",
      headers: {
        "Client-ID": IGDB_CLIENT_ID as string,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "text/plain",
      },
      body: `
        search "${query}";
        fields name,cover.url,platforms.name,first_release_date;
        limit 10;
      `,
    });

    const igdbData = await igdbResponse.json();

    // Process and return the data
    const games = igdbData.map((game: IGDBGameResponse) => ({
      id: game.id,
      name: game.name,
      cover: game.cover?.url
        ? `https:${game.cover.url.replace("t_thumb", "t_cover_small")}`
        : null,
      platforms: game.platforms || [],
      first_release_date: game.first_release_date || null,
    }));

    return NextResponse.json({ games });
  } catch (error) {
    console.error("Error searching games:", error);
    return NextResponse.json(
      { error: "Failed to search games" },
      { status: 500 }
    );
  }
}
