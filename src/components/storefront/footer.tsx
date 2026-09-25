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
    <div
      className="pointer-events-none absolute left-0 right-0 top-0 h-[4.5rem] -translate-y-[99%] overflow-hidden sm:h-24 md:h-32 lg:h-36"
      aria-hidden
    >
      <svg
        className="footer-wave-layer absolute bottom-0 left-0 h-full w-[200%] max-w-none text-ink"
        viewBox="0 0 1440 96"
        preserveAspectRatio="none"
      >
        <path
          fill="currentColor"
          d="M0,68 C200,8 400,88 600,36 C800,0 1000,80 1200,28 C1320,4 1380,52 1440,44 L1440,96 L0,96 Z"
        />
      </svg>
      <svg
        className="footer-wave-layer footer-wave-layer-delay absolute bottom-0 left-0 h-full w-[200%] max-w-none text-ink/85"
        viewBox="0 0 1440 96"
        preserveAspectRatio="none"
      >
        <path
          fill="currentColor"
          d="M0,44 C280,92 560,16 840,56 C980,76 1120,24 1280,64 C1360,84 1400,72 1440,60 L1440,96 L0,96 Z"
        />
      </svg>
    </div>
  );
}

export function Footer() {
  const { settings, categories } = useShop();
  const wa = waLink(settings.whatsappNumber, "Hello Mojiano, I have a question.");

  return (
    <footer className="relative mt-28 bg-ink text-white sm:mt-32 md:mt-36">
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
