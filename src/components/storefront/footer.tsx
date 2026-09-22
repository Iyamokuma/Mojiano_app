import { Link } from "react-router-dom";
import { Logo } from "@/components/brand/logo";
import { useShop } from "@/context/shop";

function waLink(phone: unknown, message: string) {
  const digits = String(phone ?? "").replace(/[^\d]/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function Footer() {
  const { settings, categories } = useShop();
  const wa = waLink(settings.whatsappNumber, "Hello Mojiano, I have a question.");

  return (
    <footer className="mt-20 border-t border-line bg-white">
      <div className="container-page grid gap-10 py-14 md:grid-cols-4">
        <div>
          <Link to="/" aria-label="Mojiano home">
            <Logo />
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">{String(settings.tagline ?? "")}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Shop</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link to="/shop" className="hover:text-gold-deep">All products</Link></li>
            {categories.slice(0, 6).map((category) => (
              <li key={category.id}>
                <Link to={`/category/${category.slug}`} className="hover:text-gold-deep">
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Help</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link to="/about" className="hover:text-gold-deep">About Mojiano</Link></li>
            <li><Link to="/contact" className="hover:text-gold-deep">Contact</Link></li>
            {wa ? (
              <li>
                <a href={wa} className="hover:text-gold-deep" target="_blank" rel="noreferrer">
                  WhatsApp support
                </a>
              </li>
            ) : null}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Visit</p>
          <p className="mt-4 whitespace-pre-line text-sm text-muted">{String(settings.address ?? "")}</p>
          <p className="mt-3 text-sm">{String(settings.email ?? "")}</p>
          {settings.phone ? (
            <p className="text-sm">
              <a href={`tel:${String(settings.phone).replace(/[^\d+]/g, "")}`} className="hover:text-gold-deep">
                {String(settings.phone)}
              </a>
            </p>
          ) : null}
        </div>
      </div>
      <div className="border-t border-line">
        <div className="container-page py-5 text-xs text-muted">
          © {new Date().getFullYear()} {String(settings.businessName ?? "Mojiano")}
        </div>
      </div>
    </footer>
  );
}
