export function getDiscordAvatarUrl(
  userId: string,
  avatarHash: string | null
): string {
  if (!avatarHash) {
    // Default avatar based on modulo of user ID
    // Discord uses user_id % 5 to determine which default avatar to use (0-4)
    const defaultAvatarNumber = BigInt(userId) % BigInt(5);
    return `https://cdn.discordapp.com/embed/avatars/${defaultAvatarNumber}.png`;
  }

  // Format: https://cdn.discordapp.com/avatars/{user_id}/{avatar_hash}.png
  // For animated avatars (gif), we need to check if the hash starts with "a_"
  const extension = avatarHash.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${extension}`;
}
