// Optional links shown in the UI. Leave the env vars unset to hide them.
// NEXT_PUBLIC_DISCORD_URL / NEXT_PUBLIC_GITHUB_URL
export const SOCIAL_LINKS = {
  discord: process.env.NEXT_PUBLIC_DISCORD_URL || undefined,
  github: process.env.NEXT_PUBLIC_GITHUB_URL || undefined,
} as const;

// Who built NexSync (shown on the join page, in the room sidebar and in the page metadata)
export const CREDITS = {
  developers: [
    { name: "Arabi Islam", url: "https://nexeristm.vercel.app/arabiislam46ar" },
    { name: "MR. ARX", url: "https://nexeristm.vercel.app/mrarxme" },
  ],
  brands: [
    { name: "NexEris LTD", url: "https://nexeristm.vercel.app/nexerisltd" },
    { name: "NexApp OG", url: "https://nexappog.vercel.app/" },
  ],
} as const;
