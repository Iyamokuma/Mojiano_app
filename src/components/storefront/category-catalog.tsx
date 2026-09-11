import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type CategoryCard = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
};

export function CategoryCatalog({ categories }: { categories: CategoryCard[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [open, setOpen] = useState(true);

  const visible = useMemo(() => {
    if (!selected.length) return categories;
    return categories.filter((category) => selected.includes(category.slug));
  }, [categories, selected]);

  function toggle(slug: string) {
    setSelected((current) =>
      current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug],
    );
  }

  if (!categories.length) return null;

  return (
    <section className="bg-white">
      <div className="container-page py-10 md:py-14">
        <div className="grid items-start gap-10 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-14">
          <aside>
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className="flex w-full items-center justify-between text-[11px] font-medium uppercase tracking-[0.18em] text-ink lg:tracking-[0.18em]"
            >
              <span className="lg:hidden font-display text-[1.35rem] font-normal normal-case tracking-normal text-ink/80">
                Categories
              </span>
              <span className="hidden lg:inline">Categories</span>
              <ChevronDown size={16} className={cn("text-muted transition", open && "rotate-180")} />
            </button>
            {open ? (
              <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 lg:mt-4 lg:block lg:space-y-3 lg:gap-0">
                {categories.map((category) => {
                  const checked = selected.includes(category.slug);
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => toggle(category.slug)}
                      className={cn(
                        "flex w-full items-start gap-2.5 text-left leading-snug transition",
                        "text-[13px] text-muted lg:items-center lg:text-sm lg:text-ink",
                        checked && "text-ink",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] border lg:mt-0 lg:h-4 lg:w-4",
                          checked ? "border-ink bg-ink" : "border-ink/20 bg-transparent lg:border-ink/30 lg:bg-white",
                        )}
                      >
                        {checked ? (
                          <span className="-translate-y-[1px] block h-1.5 w-2 rotate-45 border-b border-r border-white" />
                        ) : null}
                      </span>
                      {category.name}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </aside>

          <div>
            <div className="mb-8 flex items-center justify-between text-sm text-muted">
              <p>
                {visible.length} categor{visible.length === 1 ? "y" : "ies"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 md:grid-cols-3 xl:grid-cols-4">
              {visible.map((category) => (
                <article key={category.id} className="flex flex-col items-center text-center">
                  <Link to={`/category/${category.slug}`} className="relative block w-full bg-white">
                    <div className="relative aspect-square overflow-hidden rounded-2xl">
                      {category.image ? (
                        <img
                          src={category.image}
                          alt={category.name}
                          className="h-full w-full object-cover object-center transition duration-500 hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-canvas text-sm text-muted">
                          {category.name}
                        </div>
                      )}
                    </div>
                  </Link>
                  <h3 className="mt-5 max-w-[16rem] text-[15px] font-medium leading-snug text-ink">
                    <Link to={`/category/${category.slug}`} className="hover:text-gold-deep">
                      {category.name}
                    </Link>
                  </h3>
                  <Link
                    to={`/category/${category.slug}`}
                    className="mt-4 inline-flex h-10 min-w-[8.5rem] items-center justify-center rounded-full border border-ink/20 bg-white px-5 text-sm text-ink transition hover:border-ink hover:bg-canvas"
                  >
                    View
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
