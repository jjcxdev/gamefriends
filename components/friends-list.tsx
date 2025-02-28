"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

interface Friend {
  username: string;
  avatar: string | undefined;
}

export function FriendsList() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) return;

        // Get friend connections
        const { data: connections } = await supabase
          .from("friend_connections")
          .select("friend_id")
          .eq("user_id", session.user.id);

        if (!connections || connections.length === 0) {
          setFriends([]);
          return;
        }

        // Fetch friend details
        const friendPromises = connections.map(async (conn) => {
          const { data: user } = await supabase
            .from("users")
            .select("discord_id")
            .eq("id", conn.friend_id)
            .single();

          if (!user) return null;

          // Fetch Discord info
          const response = await fetch(
            `/api/discord/user?id=${user.discord_id}`
          );
          if (!response.ok) return null;

          const discordUser = await response.json();
          return {
            username: discordUser.username,
            avatar: discordUser.avatar,
          };
        });

        const friendsData = (await Promise.all(friendPromises)).filter(
          (f): f is Friend => f !== null
        );
        setFriends(friendsData);
      } catch (error) {
        console.error("Error fetching friends:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFriends();
  }, [supabase]);

  if (isLoading) {
    return <div>Loading friends...</div>;
  }

  return (
    <div className="grid gap-4">
      <h2 className="text-xl font-bold">Friends</h2>
      <div className="grid gap-2">
        {friends.length === 0 ? (
          <p className="text-muted-foreground">No friends added yet</p>
        ) : (
          friends.map((friend, index) => (
            <div
              key={index}
              className="flex items-center gap-2 p-2 border rounded-lg"
            >
              <Avatar>
                <AvatarImage src={friend.avatar} alt={friend.username} />
                <AvatarFallback>{friend.username[0]}</AvatarFallback>
              </Avatar>
              <span>{friend.username}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
