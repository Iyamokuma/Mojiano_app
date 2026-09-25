import { Link } from "react-router-dom";
import { Logo } from "@/components/brand/logo";
import { useShop } from "@/context/shop";
import { cn } from "@/lib/utils";

function waLink(phone: unknown, message: string) {
  const digits = String(phone ?? "").replace(/[^\d]/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

function FooterWave() {
  return (
    <div className="pointer-events-none absolute left-0 right-0 top-0 h-14 -translate-y-[99%] overflow-hidden md:h-[4.5rem]" aria-hidden>
      <svg
        className="footer-wave-layer absolute bottom-0 left-0 h-full w-[200%] max-w-none text-ink"
        viewBox="0 0 1440 56"
        preserveAspectRatio="none"
      >
        <path
          fill="currentColor"
          d="M0,36 C240,8 480,52 720,28 C960,4 1200,48 1440,24 L1440,56 L0,56 Z"
        />
      </svg>
      <svg
        className="footer-wave-layer footer-wave-layer-delay absolute bottom-0 left-0 h-full w-[200%] max-w-none text-ink/90"
        viewBox="0 0 1440 56"
        preserveAspectRatio="none"
      >
        <path
          fill="currentColor"
          d="M0,28 C320,52 640,12 960,32 C1120,44 1280,40 1440,32 L1440,56 L0,56 Z"
        />
      </svg>
    </div>
  );
}

export function Footer() {
  const { settings, categories } = useShop();
  const wa = waLink(settings.whatsappNumber, "Hello Mojiano, I have a question.");

  return (
    <footer className="relative mt-24 bg-ink text-white md:mt-28">
      <FooterWave />
      <div className="container-page grid gap-10 py-14 md:grid-cols-4 md:py-16">
        <div>
          <Link to="/" aria-label="Mojiano home">
            <Logo tone="dark" />
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/65">{String(settings.tagline ?? "")}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">Shop</p>
          <ul className="mt-4 space-y-2 text-sm text-white/80">
            <li>
              <Link to="/shop" className="transition hover:text-gold">
                All products
              </Link>
            </li>
            {categories.slice(0, 6).map((category) => (
              <li key={category.id}>
                <Link to={`/category/${category.slug}`} className="transition hover:text-gold">
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">Help</p>
          <ul className="mt-4 space-y-2 text-sm text-white/80">
            <li>
              <Link to="/about" className="transition hover:text-gold">
                About Mojiano
              </Link>
            </li>
            <li>
              <Link to="/contact" className="transition hover:text-gold">
                Contact
              </Link>
            </li>
            {wa ? (
              <li>
                <a href={wa} className="transition hover:text-gold" target="_blank" rel="noreferrer">
                  WhatsApp support
                </a>
              </li>
            ) : null}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">Visit</p>
          <p className="mt-4 whitespace-pre-line text-sm text-white/65">{String(settings.address ?? "")}</p>
          <p className="mt-3 text-sm text-white/80">{String(settings.email ?? "")}</p>
          {settings.phone ? (
            <p className="text-sm text-white/80">
              <a href={`tel:${String(settings.phone).replace(/[^\d+]/g, "")}`} className="transition hover:text-gold">
                {String(settings.phone)}
              </a>
            </p>
          ) : null}
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className={cn("container-page py-5 text-xs text-white/45")}>
          © {new Date().getFullYear()} {String(settings.businessName ?? "Mojiano")}
        </div>
      </div>
    </footer>
  );
}
