"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { Search, Loader2, Plus } from "lucide-react";
import { Session } from "@supabase/supabase-js";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

interface Game {
  id: number;
  name: string;
  cover?: string;
  platforms: string[];
  first_release_date?: number;
}

interface IGDBGameResponse {
  id: number;
  name: string;
  cover?: string;
  platforms?: string[];
  first_release_date?: number;
}

export function AddGameDialog({ onGameAdded }: { onGameAdded: () => void }) {
  const supabase = createClient();
  const [session, setSession] = useState<Session | null>(null);
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Game[]>([]);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string>("");
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const { toast } = useToast();

  // Get session on component mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
  }, [supabase.auth]);

  // Reset selected platform when a new game is selected
  useEffect(() => {
    setSelectedPlatform("");
  }, [selectedGame]);

  const searchGames = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchResults([]);
    setSelectedGame(null);

    try {
      const response = await fetch(
        `/api/games?query=${encodeURIComponent(searchQuery)}`
      );

      if (!response.ok) {
        throw new Error("Failed to search games");
      }

      const data = await response.json();

      // Transform IGDB data to match our interface
      const processedGames = data.games.map((game: IGDBGameResponse) => ({
        id: game.id,
        name: game.name,
        cover: game.cover ? `https:${game.cover}` : null,
        platforms: game.platforms || [],
        first_release_date: game.first_release_date,
      }));

      setSearchResults(processedGames);
    } catch (err) {
      toast({
        title: "Error",
        description: `Failed to search games: ${
          err instanceof Error ? err.message : "Unknown error"
        }`,
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectGame = (game: Game) => {
    setSelectedGame(game);

    // If game has only one platform, select it automatically
    if (game.platforms && game.platforms.length === 1) {
      const platformName = mapPlatformName(game.platforms[0]);
      setSelectedPlatform(platformName);
    } else {
      setSelectedPlatform("");
    }
  };

  // Map IGDB platform names to our simplified list
  const mapPlatformName = (igdbPlatform: string): string => {
    const lowerPlatform = igdbPlatform.toLowerCase();

    if (lowerPlatform.includes("pc") || lowerPlatform.includes("windows"))
      return "PC";
    if (lowerPlatform.includes("playstation")) return "PlayStation";
    if (lowerPlatform.includes("xbox")) return "Xbox";
    if (lowerPlatform.includes("nintendo") || lowerPlatform.includes("switch"))
      return "Nintendo Switch";
    if (lowerPlatform.includes("ios") || lowerPlatform.includes("android"))
      return "Mobile";

    return "Other";
  };

  const addGameToLibrary = async () => {
    if (!selectedGame || !selectedPlatform) {
      toast({
        title: "Missing information",
        description: "Please select a game and platform",
        variant: "destructive",
      });
      return;
    }

    if (!session?.user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to add games",
        variant: "destructive",
      });
      return;
    }

    setIsAdding(true);

    try {
      // Check if game exists with this platform
      const { data: existingGame, error: gameCheckError } = await supabase
        .from("games")
        .select("id")
        .eq("igdb_id", selectedGame.id)
        .eq("platform", selectedPlatform)
        .maybeSingle();

      if (gameCheckError) throw gameCheckError;

      let gameId: number;

      if (!existingGame) {
        // Game doesn't exist for this platform, create it
        const { data: newGame, error: insertGameError } = await supabase.rpc(
          "create_game",
          {
            p_igdb_id: selectedGame.id,
            p_name: selectedGame.name,
            p_cover: selectedGame.cover,
            p_platform: selectedPlatform,
            p_release_date: selectedGame.first_release_date
              ? new Date(selectedGame.first_release_date * 1000)
              : null,
          }
        );

        if (insertGameError) throw insertGameError;
        if (!newGame) throw new Error("Failed to create game");

        gameId = newGame.id;
      } else {
        gameId = existingGame.id;
      }

      // Add to user's library
      const { error: userGameError } = await supabase
        .from("user_games")
        .insert({
          user_id: session.user.id, // UUID from session
          game_id: gameId, // int8 from games table
          added_at: new Date(),
        });

      if (userGameError) {
        // If it's a unique constraint violation, the user already has this game
        if (userGameError.code === "23505") {
          toast({
            title: "Game already in library",
            description: "You already have this game on this platform",
            variant: "default",
          });
          return;
        }
        throw userGameError;
      }

      toast({
        title: "Success",
        description: "Game added to your library",
      });

      // Clear search input and results after successfully adding game
      setSearchQuery("");
      setSearchResults([]);
      setSelectedGame(null);

      onGameAdded();
      setOpen(false);
    } catch (error) {
      console.error("Error adding game:", error);
      toast({
        title: "Error",
        description: "Failed to add game to library",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  const fetchData = useCallback(async () => {
    if (!session?.user?.id) {
      toast({
        title: "Error",
        description: "User is not authenticated.",
        variant: "destructive",
      });
      setIsAdding(false);
      return;
    }
    // ... rest of the function
  }, [session, toast]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchData();
    }
  }, [fetchData, session]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus size={16} />
          Add Game
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Game to Library</DialogTitle>
          <DialogDescription>
            Search for a game to add to your collection.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 items-center">
          <Input
            placeholder="Search for a game..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchGames()}
          />
          <Button
            variant="outline"
            size="icon"
            onClick={searchGames}
            disabled={isSearching || !searchQuery.trim()}
          >
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>

        {isSearching ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : searchResults.length > 0 ? (
          <div className="max-h-[200px] overflow-y-auto border rounded-md">
            {searchResults.map((game) => (
              <div
                key={game.id}
                className={`flex items-center gap-3 p-2 hover:bg-muted cursor-pointer ${
                  selectedGame?.id === game.id ? "bg-muted" : ""
                }`}
                onClick={() => handleSelectGame(game)}
              >
                <div className="w-10 h-14 bg-muted flex-shrink-0 rounded overflow-hidden">
                  {game.cover ? (
                    <Image
                      src={game.cover}
                      alt={game.name}
                      width={40}
                      height={56}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                      No img
                    </div>
                  )}
                </div>
                <div>
                  <div className="font-medium">{game.name}</div>
                  {game.first_release_date && (
                    <div className="text-xs text-muted-foreground">
                      {new Date(game.first_release_date * 1000).getFullYear()}
                    </div>
                  )}
                  {game.platforms && game.platforms.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {game.platforms
                        .slice(0, 3)
                        .map((p) => p)
                        .join(", ")}
                      {game.platforms.length > 3 && "..."}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : searchQuery && !isSearching ? (
          <div className="text-center py-4 text-muted-foreground">
            No games found. Try a different search term.
          </div>
        ) : null}

        {selectedGame && (
          <div className="space-y-4 pt-2">
            <div className="font-medium">
              Selected Game: {selectedGame.name}
            </div>

            <div className="space-y-2">
              <label htmlFor="platform" className="text-sm font-medium">
                Platform
              </label>
              <Select
                value={selectedPlatform}
                onValueChange={setSelectedPlatform}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  {(selectedGame.platforms || []).map((platform) => (
                    <SelectItem key={platform} value={platform}>
                      {platform}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={addGameToLibrary}
            disabled={!selectedGame || !selectedPlatform || isAdding}
          >
            {isAdding ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              "Add to Library"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
