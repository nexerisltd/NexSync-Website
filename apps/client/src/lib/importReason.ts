/**
 * Turns the raw failure reason of a YouTube import (from yt-dlp, the cloud worker or the bucket) into one
 * short sentence for the toast. Never shows raw XML/HTML from the storage provider.
 */
export function describeImportReason(reason?: string): string {
  if (!reason) return "";
  const text = reason
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const lower = text.toLowerCase();

  if (lower.includes("not a bot") || lower.includes("sign in to confirm")) {
    return "YouTube is blocking the server (needs cookies).";
  }
  if (lower.includes("invalidkey") || lower.includes("invalid key")) {
    return "The storage rejected a file name. Update the server and try again.";
  }
  if (lower.includes("video unavailable") || lower.includes("private video")) {
    return "Some videos are private or unavailable.";
  }
  if (lower.includes("no cloud worker") || lower.includes("stopped responding")) {
    return text;
  }
  if (lower.includes("storage") || lower.includes("bucket upload") || lower.includes("presign")) {
    return `Storage error: ${text.slice(0, 120)}`;
  }
  return text.slice(0, 140);
}
