"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { Loader2, UserPlus, Check, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "./ui/input";

/* eslint-disable @typescript-eslint/no-unused-vars */

interface DiscordFriend {
  id: string;
  username: string;
  avatar: string | undefined;
  isConnected: boolean;
}

export function DiscordConnect({
  onFriendsUpdated,
}: {
  onFriendsUpdated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<DiscordFriend[]>([]);
  const supabase = createClient();
  const { toast } = useToast();

  const searchUsers = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }
      setIsLoading(true);
      try {
        const response = await fetch(`/api/discord/search?query=${query}`);
        if (!response.ok) throw new Error("Failed to search users");
        const data = await response.json();
        setSearchResults(data.users);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to search users",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [toast]
  );

  const debouncedSearch = useCallback(
    (query: string) => {
      searchUsers(query);
    },
    [searchUsers]
  );

  // Handle search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    debouncedSearch(query);
  };

  // Add friend from Discord
  const addFriend = async (user: DiscordFriend) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error("Not authenticated");
      }

      // Check if friend connection already exists
      const { data: existingConnection } = await supabase
        .from("friend_connections")
        .select()
        .eq("user_id", session.user.id)
        .eq("friend_id", user.id)
        .maybeSingle();

      if (existingConnection) {
        toast({
          title: "Already Friends",
          description: "You're already friends with this user!",
        });
        return;
      }

      // Add friend connection
      const { error: connectionError } = await supabase
        .from("friend_connections")
        .insert({
          user_id: session.user.id,
          friend_id: user.id,
        });

      if (connectionError) throw connectionError;

      toast({
        title: "Friend Added",
        description: `Successfully added ${user.username} as a friend!`,
      });

      // Clear search input and results after successfully adding friend
      setSearchQuery("");
      setSearchResults([]);

      // Refresh the friends list
      onFriendsUpdated();

      // Optionally close the dialog
      setOpen(false);
    } catch (error) {
      console.error("Error adding friend:", error);
      toast({
        title: "Error",
        description: "Failed to add friend. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleConnect = async () => {
    try {
      await supabase.auth.signInWithOAuth({
        provider: "discord",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: "identify email connections",
          queryParams: {
            prompt: "consent",
          },
        },
      });
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to connect with Discord",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <UserPlus className="mr-2 h-4 w-4" />
          Add Friend
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Friends</DialogTitle>
          <DialogDescription>Search by Discord ID</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-col space-y-2">
            <Input
              placeholder="Enter Discord ID..."
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </div>

          {isLoading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : searchResults.length === 0 && searchQuery ? (
            <div className="text-center text-sm text-muted-foreground p-4">
              No users found
            </div>
          ) : (
            <div className="space-y-2">
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-2 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback>
                        {user.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{user.username}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => addFriend(user)}
                    disabled={user.isConnected}
                  >
                    {user.isConnected ? (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Friends
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Add
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
