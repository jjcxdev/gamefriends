import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getDiscordAvatarUrl } from "@/utils/discord";

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

  console.log(
    "Auth callback triggered with code:",
    code ? "Present" : "Missing"
  );

  if (code) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    try {
      console.log("Exchanging code for session...");
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error("Error exchanging code for session:", error);
        return NextResponse.redirect(
          new URL("/login?error=auth", requestUrl.origin)
        );
      }

      if (!data?.user) {
        console.error("No user data returned from session exchange");
        return NextResponse.redirect(
          new URL("/login?error=nouser", requestUrl.origin)
        );
      }

      console.log("Session obtained for user:", data.user.id);

      const discordIdentity = data.user.identities?.find(
        (identity) => identity.provider === "discord"
      ) as DiscordIdentityData | undefined;

      if (!discordIdentity) {
        console.error("No Discord identity found in user data");
        return NextResponse.redirect(
          new URL("/login?error=nodiscord", requestUrl.origin)
        );
      }

      console.log("Discord identity found with ID:", discordIdentity.id);

      // First, ensure the user record exists with discord_id
      const { error: userError } = await supabase.from("users").upsert(
        {
          id: data.user.id,
          discord_id: discordIdentity.id,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "id",
        }
      );

      if (userError) {
        console.error("Error upserting user record:", userError);
      } else {
        console.log("User record updated with discord_id");
      }

      // Use bot token to fetch Discord user data
      const botToken = process.env.DISCORD_BOT_TOKEN;
      if (botToken) {
        try {
          console.log("Fetching Discord user details with bot token...");
          const discordUserResponse = await fetch(
            `https://discord.com/api/v10/users/${discordIdentity.id}`,
            {
              headers: {
                Authorization: `Bot ${botToken}`,
              },
            }
          );

          if (discordUserResponse.ok) {
            const discordUser = await discordUserResponse.json();
            console.log(
              "Discord user details fetched with bot:",
              discordUser.username,
              "Avatar:",
              discordUser.avatar ? "Present" : "Missing"
            );

            // Store Discord connection data
            const { error: connectionError } = await supabase
              .from("discord_connections")
              .upsert(
                {
                  user_id: data.user.id,
                  discord_id: discordIdentity.id,
                  discord_username: discordUser.username || "Unknown",
                  discord_avatar: getDiscordAvatarUrl(
                    discordIdentity.id,
                    discordUser.avatar
                  ),
                  updated_at: new Date().toISOString(),
                },
                {
                  onConflict: "user_id",
                }
              );

            if (connectionError) {
              console.error(
                "Error upserting Discord connection with bot token:",
                connectionError
              );
            } else {
              console.log(
                "Discord connection data saved successfully with bot token"
              );
            }
          }
        } catch (botError) {
          console.error(
            "Error fetching Discord user with bot token:",
            botError
          );
        }
      }
    } catch (sessionError) {
      console.error("Error in auth callback:", sessionError);
      return NextResponse.redirect(
        new URL("/login?error=general", requestUrl.origin)
      );
    }
  } else {
    console.error("No code provided in callback URL");
    return NextResponse.redirect(
      new URL("/login?error=nocode", requestUrl.origin)
    );
  }

  console.log("Auth callback completed successfully, redirecting to home");
  return NextResponse.redirect(new URL("/", requestUrl.origin));
}
