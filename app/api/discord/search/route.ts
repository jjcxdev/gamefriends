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

    console.log(`Attempting to search with Discord ID: "${query}"`);

    // Try multiple query approaches
    const { data: exactMatch, error: exactError } = await supabase
      .from("discord_connections")
      .select("*")
      .eq("discord_id", query.toString());

    console.log("Exact match attempt:", {
      data: exactMatch,
      error: exactError,
    });

    // Try with textual comparison
    const { data: textMatch, error: textError } = await supabase
      .from("discord_connections")
      .select("*")
      .filter("discord_id", "ilike", query.toString());

    console.log("Text match attempt:", { data: textMatch, error: textError });

    // Try with raw query
    const { data: rawMatch, error: rawError } = await supabase
      .from("discord_connections")
      .select("*")
      .or(`discord_id.eq.${query},discord_id.eq."${query}"`);

    console.log("Raw match attempt:", { data: rawMatch, error: rawError });

    // Combine all unique results
    const allMatches = [
      ...new Set([
        ...(exactMatch || []),
        ...(textMatch || []),
        ...(rawMatch || []),
      ]),
    ];

    // Filter out current user
    const filteredUsers = allMatches.filter(
      (user) => user.user_id !== session.user.id
    );

    const result = {
      users: filteredUsers.map((user) => ({
        id: user.user_id,
        discord_id: user.discord_id,
        username: user.discord_username,
        avatar: user.discord_avatar,
        isConnected: false,
      })),
      debug: {
        exactMatch: exactMatch?.length || 0,
        textMatch: textMatch?.length || 0,
        rawMatch: rawMatch?.length || 0,
        query,
        queryType: typeof query,
        errors: {
          exact: exactError?.message,
          text: textError?.message,
          raw: rawError?.message,
        },
      },
    };

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
