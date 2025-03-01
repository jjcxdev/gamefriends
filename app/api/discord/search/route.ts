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

    // Direct query with console logging
    console.log(`Searching for Discord ID: "${query}" (type: ${typeof query})`);

    // Explicitly use a string comparison
    const { data: users, error } = await supabase
      .from("discord_connections")
      .select("*")
      .filter("discord_id", "eq", query.toString());

    console.log("Query results:", JSON.stringify(users), "Error:", error);

    if (error) {
      console.error("Search error:", error);
      return NextResponse.json(
        { error: "Database search failed" },
        { status: 500 }
      );
    }

    // Return the raw results for debugging
    return NextResponse.json({
      query: query,
      users: users || [],
      count: users?.length || 0,
    });
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
