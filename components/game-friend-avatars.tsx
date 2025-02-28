"use client";

import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "./ui/tooltip";

interface GameFriendAvatarsProps {
  friends: Array<{
    id: string;
    name: string;
    avatar?: string;
  }>;
  gameId: number;
  ownedByFriendIds: Set<string>;
}

export function GameFriendAvatars({
  friends,
  gameId,
  ownedByFriendIds,
}: GameFriendAvatarsProps) {
  console.log("GameFriendAvatars props:", {
    friends,
    gameId,
    ownedByFriendIds,
  });

  return (
    <div className="flex -space-x-2 justify-start">
      {friends.map((friend) => (
        <TooltipProvider key={friend.id}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Avatar
                  className={`border-2 border-background ${
                    ownedByFriendIds.has(friend.id)
                      ? "opacity-100"
                      : "opacity-30"
                  }`}
                >
                  <AvatarImage src={friend.avatar} />
                  <AvatarFallback>{friend.name[0]}</AvatarFallback>
                </Avatar>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{friend.name}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
    </div>
  );
}
