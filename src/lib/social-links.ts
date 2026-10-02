/** Normalise social URLs from admin settings (handles @handles or full links). */
export function socialHref(raw: unknown, kind: "facebook" | "instagram" | "tiktok" | "snapchat"): string | null {
  const value = String(raw ?? "").trim();
  if (!value) return defaultSocial(kind);
  if (/^https?:\/\//i.test(value)) return value;
  const handle = value.replace(/^@/, "");
  switch (kind) {
    case "facebook":
      return `https://www.facebook.com/${handle}`;
    case "instagram":
      return `https://www.instagram.com/${handle.replace(/\/$/, "")}/`;
    case "tiktok":
      return `https://www.tiktok.com/@${handle}`;
    case "snapchat":
      return `https://www.snapchat.com/add/${handle}`;
    default:
      return null;
  }
}

function defaultSocial(kind: "facebook" | "instagram" | "tiktok" | "snapchat"): string {
  switch (kind) {
    case "facebook":
      return "https://www.facebook.com/mojiano.mojiano";
    case "instagram":
      return "https://www.instagram.com/mojianocollections/";
    case "tiktok":
      return "https://www.tiktok.com/@mojiano11";
    case "snapchat":
      return "https://www.snapchat.com/add/mojiano22";
  }
}
