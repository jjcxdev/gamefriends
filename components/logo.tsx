import { Gamepad } from "lucide-react";

export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex w-fit items-center justify-center p-2 bg-muted rounded-full">
        <Gamepad className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-bold font-gameboy">GameFriends</h1>
    </div>
  );
}
