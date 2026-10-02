import { socialHref } from "@/lib/social-links";

function IconButton({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition hover:border-gold/50 hover:bg-white/10 hover:text-gold"
    >
      {children}
    </a>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
      <path d="M13.5 8.5V6.7c0-.8.6-1 1-1h1.8V3h-2.5c-2.4 0-3.8 1.5-3.8 4v1.5H8v2.8h2.5V21h3V11.3h2.4l.4-2.8H13.5z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.75]" aria-hidden>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
      <path d="M16.5 3h-2.4c.2 1.8 1.4 3.4 3.1 3.9v2.2c-1.1 0-2.1-.3-3-1v6.8c0 3-2.4 5.2-5.4 5.2S3.4 18.9 3.4 16s2.4-5.2 5.4-5.2c.4 0 .9.1 1.3.2v2.5c-.3-.1-.7-.2-1-.2-1.3 0-2.3 1-2.3 2.5s1 2.5 2.3 2.5 2.3-1 2.3-2.5V3z" />
    </svg>
  );
}

function SnapchatIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
      <path d="M12 2c2.8 0 5 2.1 5.2 4.9.9.2 1.7.6 2.4 1.1-.3.7-.9 1.2-1.6 1.4.1.5.1 1-.1 1.5-.6-.1-1.2-.1-1.8 0 .2.9.3 1.8.1 2.7-.8.3-1.6.5-2.4.5-.3.6-.9 1.1-1.6 1.4-.7-.3-1.3-.8-1.6-1.4-.8 0-1.6-.2-2.4-.5-.2-.9-.1-1.8.1-2.7-.6-.1-1.2-.1-1.8 0-.2-.5-.2-1 .1-1.5-.7-.2-1.3-.7-1.6-1.4.7-.5 1.5-.9 2.4-1.1C7 4.1 9.2 2 12 2z" />
    </svg>
  );
}

export function FooterSocial({ settings }: { settings: Record<string, string | number | boolean | null> }) {
  const links = [
    { kind: "facebook" as const, label: "Mojiano on Facebook", icon: <FacebookIcon /> },
    { kind: "instagram" as const, label: "Mojiano on Instagram", icon: <InstagramIcon /> },
    { kind: "tiktok" as const, label: "Mojiano on TikTok", icon: <TikTokIcon /> },
    { kind: "snapchat" as const, label: "Mojiano on Snapchat", icon: <SnapchatIcon /> },
  ];

  return (
    <div className="mt-6 flex flex-wrap gap-2">
      {links.map(({ kind, label, icon }) => {
        const href = socialHref(settings[`${kind}Url`], kind);
        if (!href) return null;
        return (
          <IconButton key={kind} href={href} label={label}>
            {icon}
          </IconButton>
        );
      })}
    </div>
  );
}
