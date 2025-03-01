import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  try {
    const { searchParams } = new URL(request.url);
    const discordId = searchParams.get("id") || "298457552302374913";

    // Direct query to check if the Discord ID exists
    const { data, error } = await supabase
      .from("discord_connections")
      .select("*")
      .eq("discord_id", discordId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      discord_id: discordId,
      found: data && data.length > 0,
      records: data,
    });
  } catch (error) {
    console.error("Debug error:", error);
    return NextResponse.json({ error: "Debug failed" }, { status: 500 });
  }
}
