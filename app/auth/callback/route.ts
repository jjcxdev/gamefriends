import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { UserIdentity } from "@supabase/supabase-js";

interface DiscordIdentityData {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data?.user) {
      const discordIdentity = data.user.identities?.find(
        (
          identity: UserIdentity
        ): identity is UserIdentity & DiscordIdentityData =>
          identity.provider === "discord"
      );

      if (discordIdentity) {
        // Update the user's discord_id and store connection data
        await Promise.all([
          supabase
            .from("users")
            .update({ discord_id: discordIdentity.id })
            .eq("id", data.user.id),

          supabase.from("discord_connections").upsert(
            {
              user_id: data.user.id,
              discord_id: discordIdentity.id,
              access_token: discordIdentity.access_token,
              refresh_token: discordIdentity.refresh_token,
              scopes: "identify email guilds guilds.members.read",
              token_expires_at: new Date(
                Date.now() + (discordIdentity.expires_in || 604800) * 1000
              ).toISOString(),
            },
            {
              onConflict: "user_id",
            }
          ),
        ]);
      }
    }
  }

  return NextResponse.redirect(new URL("/", requestUrl.origin));
}
