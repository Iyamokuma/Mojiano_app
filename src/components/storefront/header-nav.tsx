import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Menu, Search, ShoppingBag, User, X } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { TornEdge } from "@/components/brand/torn-edge";
import { CategoryRail } from "@/components/storefront/category-rail";
import { useShop } from "@/context/shop";

type CategoryLink = {
  name: string;
  slug: string;
  children: { name: string; slug: string }[];
};

export function HeaderNav({
  categories,
  cartCount,
  signedIn,
}: {
  categories: CategoryLink[];
  cartCount: number;
  signedIn: boolean;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { spotlightSlug } = useShop();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    setOpen(false);
    setSearchOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = open || searchOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open, searchOpen]);

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    const value = query.trim();
    if (!value) return;
    navigate(`/search?q=${encodeURIComponent(value)}`);
    setSearchOpen(false);
  }

  return (
    <header className="sticky top-0 z-40 bg-canvas">
      <div className="relative">
      <div className="container-page flex h-[4.25rem] items-center gap-3 md:h-[4.75rem]">
        <button
          className="inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-canvas-warm lg:hidden"
          aria-label="Open menu"
          onClick={() => setOpen(true)}
        >
          <Menu size={20} />
        </button>

        <Link to="/" className="min-w-0" aria-label="Mojiano home">
          <Logo />
        </Link>

        <form onSubmit={submitSearch} className="mx-6 hidden flex-1 lg:block">
          <label className="relative block">
            <span className="sr-only">Search products</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search products, brands or SKU"
              className="h-11 w-full rounded-full border border-line bg-white pl-10 pr-4 text-sm outline-none transition focus:border-gold"
            />
          </label>
        </form>

        <div className="ml-auto flex items-center gap-1">
          <button
            className="inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-canvas-warm lg:hidden"
            aria-label="Search"
            onClick={() => setSearchOpen(true)}
          >
            <Search size={18} />
          </button>
          <Link
            to={signedIn ? "/account" : "/login"}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-canvas-warm"
            aria-label="Account"
          >
            <User size={18} />
          </Link>
          <Link
            to="/basket"
            className="relative inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-canvas-warm"
            aria-label={`Basket, ${cartCount} items`}
          >
            <ShoppingBag size={18} />
            {cartCount > 0 ? (
              <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-pink-deep px-1 text-[10px] font-semibold text-white">
                {cartCount}
              </span>
            ) : null}
          </Link>
        </div>
      </div>

      <CategoryRail categories={categories} activeSlug={spotlightSlug} />
      <TornEdge className="pointer-events-none absolute -bottom-6 left-0 z-20 h-7 w-full text-canvas drop-shadow-[0_8px_12px_rgba(28,20,16,0.14)]" />
      </div>

      {searchOpen ? (
        <div className="fixed inset-0 z-50 bg-canvas p-4 lg:hidden">
          <div className="flex items-center justify-between">
            <p className="text-sm uppercase tracking-[0.16em] text-muted">Search</p>
            <button aria-label="Close search" onClick={() => setSearchOpen(false)} className="h-11 w-11">
              <X className="mx-auto" />
            </button>
          </div>
          <form onSubmit={submitSearch} className="mt-6">
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="What are you looking for?"
              className="h-14 w-full border-b border-ink bg-transparent text-xl outline-none"
            />
          </form>
        </div>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-ink/40" aria-label="Close menu" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[min(100%,22rem)] flex-col bg-canvas shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4">
              <Logo />
              <button aria-label="Close menu" className="h-11 w-11" onClick={() => setOpen(false)}>
                <X className="mx-auto" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-5 pb-10">
              <Link to="/shop" className="block border-b border-line py-3 text-lg">
                Shop all
              </Link>
              {categories.map((category) => (
                <Link key={category.slug} to={`/category/${category.slug}`} className="block border-b border-line py-3 text-lg">
                  {category.name}
                </Link>
              ))}
              <div className="mt-6 space-y-3 text-sm">
                <Link to={signedIn ? "/account" : "/login"} className="block">
                  {signedIn ? "My account" : "Sign in"}
                </Link>
                <Link to="/contact" className="block">
                  Contact
                </Link>
              </div>
            </nav>
          </div>
        </div>
      ) : null}
    </header>
  );
}
