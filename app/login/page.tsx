"use client";

import { createClient } from "@/utils/supabase/client";
import { DiscordLogoIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/logo";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    // Check if already logged in
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        router.push("/");
      }
    };
    checkSession();
  }, [router, supabase.auth]);

  const signInWithDiscord = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: "identify email guilds guilds.members.read",
        queryParams: {
          prompt: "consent",
        },
      },
    });

    if (error) {
      console.error("Error:", error.message);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-[300px]">
        <CardHeader className="text-center">
          <CardTitle>Welcome to</CardTitle>
          <CardDescription>
            <Logo />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white"
            onClick={signInWithDiscord}
          >
            <DiscordLogoIcon className="mr-2 h-5 w-5" />
            Sign in
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
