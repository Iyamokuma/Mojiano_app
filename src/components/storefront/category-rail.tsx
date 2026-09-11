import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

type CategoryLink = {
  name: string;
  slug: string;
};

export function CategoryRail({
  categories,
  activeSlug,
}: {
  categories: CategoryLink[];
  activeSlug?: string | null;
}) {
  const location = useLocation();
  const routeSlug = location.pathname.startsWith("/category/")
    ? location.pathname.split("/")[2]
    : location.pathname === "/shop"
      ? "all"
      : null;
  const current = routeSlug || activeSlug || null;

  const items = [
    { name: "All", slug: "all", href: "/shop" },
    ...categories.map((category) => ({
      name: category.name,
      slug: category.slug,
      href: `/category/${category.slug}`,
    })),
  ];

  return (
    <nav className="hidden border-t border-line/60 lg:block" aria-label="Product categories">
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 px-8 py-2.5">
        {items.map((item) => {
          const active = current === item.slug;
          return (
            <Link
              key={item.slug}
              data-slug={item.slug}
              to={item.href}
              className={cn(
                "text-[12px] uppercase tracking-[0.14em] transition",
                active ? "text-ink shadow-[inset_0_-1.5px_0_0_#c6a15b]" : "text-muted hover:text-ink",
              )}
            >
              {item.name}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
