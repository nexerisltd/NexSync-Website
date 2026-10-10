// Optional links shown in the UI. Leave the env vars unset to hide them.
// NEXT_PUBLIC_DISCORD_URL / NEXT_PUBLIC_GITHUB_URL
export const SOCIAL_LINKS = {
  discord: process.env.NEXT_PUBLIC_DISCORD_URL || undefined,
  github: process.env.NEXT_PUBLIC_GITHUB_URL || undefined,
} as const;
