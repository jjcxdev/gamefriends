import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

interface UserIdentity {
  id: string;
  provider: string;
}

interface DiscordIdentityData extends UserIdentity {
  provider: "discord";
  access_token: string;
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
        (identity) => identity.provider === "discord"
      ) as DiscordIdentityData | undefined;

      if (discordIdentity) {
        // Update the user's discord_id
        await supabase
          .from("users")
          .update({ discord_id: discordIdentity.id })
          .eq("id", data.user.id);

        // Fetch Discord user details using the access token
        try {
          const discordUserResponse = await fetch(
            "https://discord.com/api/users/@me",
            {
              headers: {
                Authorization: `Bearer ${discordIdentity.access_token}`,
              },
            }
          );

          if (discordUserResponse.ok) {
            const discordUser = await discordUserResponse.json();

            // Store only the user data, not the tokens
            await supabase.from("discord_connections").upsert(
              {
                user_id: data.user.id,
                discord_id: discordIdentity.id,
                discord_username: discordUser.username,
                discord_avatar: discordUser.avatar,
                updated_at: new Date().toISOString(),
              },
              {
                onConflict: "user_id",
              }
            );
          } else {
            console.error(
              "Failed to fetch Discord user details:",
              await discordUserResponse.text()
            );
          }
        } catch (fetchError) {
          console.error("Error fetching Discord user data:", fetchError);
        }
      }
    }
  }

  return NextResponse.redirect(new URL("/", requestUrl.origin));
}
