"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { Loader2 } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { AddGameDialog } from "@/components/add-game-dialog";
import { DiscordConnect } from "@/components/discord-connect";
import { ThemeSwitch } from "@/components/theme-switch";
import { Logo } from "./logo";
import { Footer } from "./footer";
import { SignOutButton } from "@/components/sign-out-button";
import { GameFriendAvatars } from "@/components/game-friend-avatars";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Types
interface Game {
  id: number;
  igdb_id: number;
  name: string;
  cover: string | null;
  platform: string;
  release_date: Date | null;
}

interface Friend {
  id: string;
  name: string;
  avatar?: string;
  games: number[]; // Array of game IDs the friend owns
}

interface GameOwnership {
  user_id: string;
  game_id: number;
  platform: string;
}

interface GameDashboardProps {
  initialSession: Session;
}

export function GameDashboard({ initialSession }: GameDashboardProps) {
  const supabase = createClient();
  const [session, setSession] = useState<Session | null>(initialSession);
  /* eslint-disable @typescript-eslint/no-unused-vars */
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [userGames, setUserGames] = useState<Game[]>([]);
  /* eslint-enable @typescript-eslint/no-unused-vars */
  const [games, setGames] = useState<Game[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendOwnerships, setFriendOwnerships] = useState<GameOwnership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Move hooks to top level
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      if (!session?.user?.id) {
        throw new Error("User is not authenticated.");
      }

      // Fetch user's games
      const { data: userGames, error: gamesError } = await supabase
        .from("games")
        .select(
          `
        *,
        user_games!inner(user_id)
      `
        )
        .eq("user_games.user_id", session.user.id);

      if (gamesError) throw gamesError;

      // Transform the data to match our Game interface
      const transformedGames: Game[] =
        userGames?.map((game) => ({
          id: game.id,
          igdb_id: game.igdb_id,
          name: game.name,
          cover: game.cover,
          platform: game.platform,
          release_date: game.release_date ? new Date(game.release_date) : null,
        })) || [];

      setGames(transformedGames);

      // Extract unique platforms from actual games
      const uniquePlatforms = [
        ...new Set(transformedGames.map((game) => game.platform)),
      ].sort();
      setPlatforms(uniquePlatforms);

      // Fetch current user's games
      const { data: currentUserGames } = await supabase
        .from("user_games")
        .select("*")
        .eq("user_id", session.user.id);

      setUserGames(currentUserGames || []);

      // Get friend connections
      const { data: connections } = await supabase
        .from("friend_connections")
        .select("*")
        .eq("user_id", session.user.id);

      if (!connections) return;

      // Get friend details
      const friendIds = connections.map((conn) => conn.friend_id);
      const { data: friendUsers } = await supabase
        .from("users")
        .select("id, discord_id")
        .in("id", friendIds);

      if (!friendUsers) return;

      // Get friend game ownerships
      const { data: ownerships } = await supabase
        .from("user_games")
        .select("*")
        .in("user_id", friendIds);

      setFriendOwnerships(ownerships || []);

      // Get Discord info for each friend
      const friendsWithInfo = await Promise.all(
        friendUsers.map(async (user) => {
          try {
            const response = await fetch(
              `/api/discord/user?id=${user.discord_id}`
            );
            if (!response.ok) return null;
            const discordInfo = await response.json();
            return {
              id: user.id,
              name: discordInfo.username,
              avatar: discordInfo.avatar || undefined,
              games:
                ownerships
                  ?.filter((o) => o.user_id === user.id)
                  .map((o) => o.game_id) || [],
            } as Friend;
          } catch (error) {
            console.error("Error fetching Discord info:", error);
            return null;
          }
        })
      );

      // Filter out nulls and set friends
      setFriends(friendsWithInfo.filter((f): f is Friend => f !== null));
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, supabase]);

  // Move useEffect to top level
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setSession(initialSession);
  }, [initialSession]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  // Only show content if we have a session
  if (!session) {
    return null;
  }

  const handleGameAdded = () => {
    fetchData();
  };

  // Group games by platform
  const gamesByPlatform = games.reduce((acc, game) => {
    if (!acc[game.platform]) {
      acc[game.platform] = [];
    }
    acc[game.platform].push(game);
    return acc;
  }, {} as Record<string, typeof games>);

  // Handle friends updated event
  const handleFriendsUpdated = () => {
    fetchData();
  };

  const GameRow = ({
    game,
    friendGames,
  }: {
    game: Game;
    friendGames?: number[];
  }) => {
    const friendHasGame = friendGames?.includes(game.id) ?? false;

    return (
      <div className="game-row">
        <div className="flex items-center gap-3">
          <div className="w-10 h-auto rounded bg-muted flex-shrink-0 overflow-hidden">
            <Image
              src={game.cover || "/default-cover.png"}
              alt={game.name}
              width={40}
              height={56}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <div className="font-medium">{game.name}</div>
            {game.release_date && (
              <div className="text-xs text-muted-foreground">
                {new Date(game.release_date).getFullYear()}
              </div>
            )}
          </div>
        </div>
        <div
          className="friend-avatar"
          style={{ opacity: friendHasGame ? 1 : 0.5 }}
        >
          {/* Discord avatar */}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="container mx-auto p-4">
        <div className="flex justify-between max-w-screen-lg mx-auto items-center mb-8">
          <div className="flex items-center gap-4">
            <Logo />
          </div>
          <div className="flex items-center gap-4">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <ThemeSwitch />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Toggle light/dark mode</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <SignOutButton />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Sign out</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        <div className="flex justify-end max-w-screen-lg mx-auto gap-4 items-center mb-8">
          <DiscordConnect onFriendsUpdated={handleFriendsUpdated} />
          <AddGameDialog onGameAdded={handleGameAdded} />
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading your game library...</span>
          </div>
        ) : error ? (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">
                Error Loading Data
              </CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => fetchData()}>Try Again</Button>
            </CardContent>
          </Card>
        ) : games.length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-xl mb-4">
              You haven&apos;t added any games yet.
            </h2>
            <p className="text-muted-foreground mb-8">
              Start by adding your first game!
            </p>
          </div>
        ) : (
          <div className="space-y-8 w-full max-w-screen-lg mx-auto">
            {Object.entries(gamesByPlatform).map(([platform, games]) => (
              <Card key={platform}>
                <CardHeader className="bg-muted/50">
                  <CardTitle>{platform}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <tbody>
                        {games.map((game) => {
                          return (
                            <tr key={game.id}>
                              <td className="p-4 w-1/3 border-r">
                                <GameRow
                                  game={game}
                                  friendGames={friendOwnerships
                                    .filter(
                                      (o) => o.user_id !== session?.user?.id
                                    )
                                    .map((o) => o.game_id)}
                                />
                              </td>
                              <td className="p-4">
                                <GameFriendAvatars
                                  friends={friends}
                                  gameId={game.id}
                                  ownedByFriendIds={
                                    new Set(
                                      friendOwnerships
                                        .filter((o) => o.game_id === game.id)
                                        .map((o) => o.user_id)
                                    )
                                  }
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <div className="flex w-full bg-muted mt-8 justify-center">
        <Footer />
      </div>
    </>
  );
}
