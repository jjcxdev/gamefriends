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

      // Update the user's discord_id
      const { error: updateError } = await supabase
        .from("users")
        .update({ discord_id: discordIdentity.id })
        .eq("id", data.user.id);

      if (updateError) {
        console.error("Error updating user's discord_id:", updateError);
      } else {
        console.log("Updated user's discord_id successfully");
      }

      // Fetch Discord user details using the access token
      try {
        console.log("Fetching Discord user details...");
        const discordUserResponse = await fetch(
          "https://discord.com/api/users/@me",
          {
            headers: {
              Authorization: `Bearer ${discordIdentity.access_token}`,
            },
          }
        );

        if (!discordUserResponse.ok) {
          const errorText = await discordUserResponse.text();
          console.error(
            "Failed to fetch Discord user details:",
            discordUserResponse.status,
            errorText
          );
          return NextResponse.redirect(
            new URL("/login?error=discordapi", requestUrl.origin)
          );
        }

        const discordUser = await discordUserResponse.json();
        console.log(
          "Discord user details fetched:",
          discordUser.username,
          "Avatar:",
          discordUser.avatar ? "Present" : "Missing"
        );

        // Store only the user data, not the tokens
        const { error: upsertError } = await supabase
          .from("discord_connections")
          .upsert(
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

        if (upsertError) {
          console.error("Error upserting Discord connection:", upsertError);
        } else {
          console.log("Discord connection data saved successfully");
        }
      } catch (fetchError) {
        console.error("Error in Discord API request:", fetchError);
        return NextResponse.redirect(
          new URL("/login?error=discordfetch", requestUrl.origin)
        );
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
