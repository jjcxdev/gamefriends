export function getDiscordAvatarUrl(
  userId: string,
  avatarHash: string | null
): string | null {
  if (!avatarHash) return null;

  // Format: https://cdn.discordapp.com/avatars/{user_id}/{avatar_hash}.png
  // For animated avatars (gif), we need to check if the hash starts with "a_"
  const extension = avatarHash.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${extension}`;
}
