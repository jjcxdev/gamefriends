import { NextResponse } from "next/server";

interface IGDBGame {
  id: number;
  name: string;
  cover?: {
    url: string;
  };
  platforms: Array<{
    name: string;
  }>;
  first_release_date?: number;
}

async function getIGDBAccessToken() {
  const response = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: process.env.IGDB_CLIENT_ID,
      client_secret: process.env.IGDB_CLIENT_SECRET,
      grant_type: "client_credentials",
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to get IGDB access token");
  }

  const data = await response.json();
  return data.access_token;
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

    // Get access token
    const accessToken = await getIGDBAccessToken();

    const response = await fetch("https://api.igdb.com/v4/games", {
      method: "POST",
      headers: {
        "Client-ID": process.env.IGDB_CLIENT_ID || "",
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "text/plain",
      },
      body: `
        search "${query}";
        fields name,cover.*,platforms.name,first_release_date;
        limit 10;
      `,
    });

    if (!response.ok) {
      console.error("IGDB API error:", await response.text());
      throw new Error("IGDB API error");
    }

    const data: IGDBGame[] = await response.json();

    const games = data.map((game: IGDBGame) => ({
      id: game.id,
      name: game.name,
      cover: game.cover?.url
        ? `//images.igdb.com/igdb/image/upload/t_cover_big/${game.cover.url
            .split("/")
            .pop()}`
        : null,
      platforms: [
        ...new Set(
          game.platforms?.map((p) => {
            if (p.name.includes("PC (Microsoft Windows)")) return "PC";
            return p.name.replace(/\([^)]*\)/g, "").trim();
          }) || []
        ),
      ],
      first_release_date: game.first_release_date,
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
