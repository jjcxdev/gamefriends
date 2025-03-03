import Image from "next/image";
import GameFriendsLogo from "@/public/images/gamefriends-logo.svg";

export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <Image src={GameFriendsLogo} alt="GameFriends Logo" />
    </div>
  );
}
