"use client";

import { createClient } from "@/utils/supabase/client";
import { LogOut } from "lucide-react";
import { Button } from "./ui/button";
import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    router.push("/login");
    await supabase.auth.signOut();
  };

  return (
    <Button variant="outline" onClick={handleSignOut} size="sm">
      <LogOut className="w-4 h-4" />
    </Button>
  );
}
