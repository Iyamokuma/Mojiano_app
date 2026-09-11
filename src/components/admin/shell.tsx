import { NavLink, Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  LayoutGrid,
  ShoppingBag,
  Package,
  Layers,
  Banknote,
  Megaphone,
  Users,
  MessageCircle,
  RotateCcw,
  CalendarDays,
  Star,
  Bug,
  CircleHelp,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { useAdminAuth } from "@/context/admin";
import { api } from "@/lib/api";
import { prefetchAdminRoute, warmupAdmin } from "@/lib/admin-prefetch";
import { AdminKeepAlive } from "@/components/admin/keep-alive";
import { cn } from "@/lib/utils";

type Leaf = {
  to: string;
  label: string;
  icon: typeof LayoutGrid;
  end?: boolean;
  match?: (pathname: string, search: string) => boolean;
};

const SHOP: Leaf[] = [
  { to: "/admin/orders", label: "All orders", icon: ShoppingBag },
  {
    to: "/admin/catalogue",
    label: "All products",
    icon: Package,
    match: (pathname, search) => pathname.startsWith("/admin/catalogue") && !search.includes("tab=rooms"),
  },
  {
    to: "/admin/catalogue?tab=rooms",
    label: "Categories",
    icon: Layers,
    match: (pathname, search) => pathname === "/admin/catalogue" && search.includes("tab=rooms"),
  },
  { to: "/admin/earnings", label: "Earnings", icon: Banknote },
  { to: "/admin/promotions", label: "Promotions", icon: Megaphone },
  { to: "/admin/customers", label: "Customers", icon: Users },
  { to: "/admin/messages", label: "Message centre", icon: MessageCircle },
];

const EVENTS: Leaf[] = [
  { to: "/admin/returns", label: "Return requests", icon: RotateCcw },
  { to: "/admin/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/admin/reviews", label: "Product reviews", icon: Star },
  { to: "/admin/bugs", label: "Bug report", icon: Bug },
];

const ACCOUNT: Leaf[] = [
  { to: "/admin/support", label: "Help & support", icon: CircleHelp },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

function leafActive(item: Leaf, pathname: string, search: string) {
  if (item.match) return item.match(pathname, search);
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

function NavLeaf({
  item,
  pathname,
  search,
  onClick,
}: {
  item: Leaf;
  pathname: string;
  search: string;
  onClick: () => void;
}) {
  const Icon = item.icon;
  const active = leafActive(item, pathname, search);
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onClick}
      onPointerEnter={() => prefetchAdminRoute(item.to)}
      onPointerDown={() => prefetchAdminRoute(item.to)}
      onFocus={() => prefetchAdminRoute(item.to)}
      className={cn(
        "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition",
        active ? "bg-white/12 text-white" : "text-white/60 hover:bg-white/8 hover:text-white",
      )}
    >
      <Icon size={18} />
      {item.label}
    </NavLink>
  );
}

function NavGroup({
  label,
  icon: Icon,
  items,
  pathname,
  search,
  onClick,
  defaultOpen,
}: {
  label: string;
  icon: typeof LayoutGrid;
  items: Leaf[];
  pathname: string;
  search: string;
  onClick: () => void;
  defaultOpen: boolean;
}) {
  const openByRoute = items.some((item) => leafActive(item, pathname, search));
  const [open, setOpen] = useState(defaultOpen || openByRoute);
  const shown = open || openByRoute;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-sm font-medium text-white hover:bg-white/8"
      >
        <span className="flex items-center gap-3">
          <Icon size={18} />
          {label}
        </span>
        <ChevronDown size={16} className={cn("text-white/45 transition", shown ? "rotate-0" : "-rotate-90")} />
      </button>
      {shown ? (
        <div className="ml-4 mt-1 space-y-1 border-l border-white/15 pl-2">
          {items.map((item) => (
            <NavLeaf key={item.to} item={item} pathname={pathname} search={search} onClick={onClick} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function AdminShell() {
  const { staff, refresh } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const pathname = location.pathname;
  const search = location.search;

  useEffect(() => {
    warmupAdmin();
  }, []);

  async function logout() {
    await api("/api/admin/auth/logout", { method: "POST" });
    await refresh();
    navigate("/admin");
  }

  const close = () => setOpen(false);

  const links = (
    <>
      <nav className="space-y-1">
        <NavLink
          to="/admin"
          end
          onClick={close}
          onPointerEnter={() => prefetchAdminRoute("/admin")}
          onPointerDown={() => prefetchAdminRoute("/admin")}
          onFocus={() => prefetchAdminRoute("/admin")}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition",
              isActive ? "bg-white/12 text-white" : "text-white/60 hover:bg-white/8 hover:text-white",
            )
          }
        >
          <LayoutGrid size={18} />
          Dashboard
        </NavLink>
        <NavGroup label="Ecommerce" icon={ShoppingBag} items={SHOP} pathname={pathname} search={search} onClick={close} defaultOpen />
      </nav>

      <p className="mb-2 mt-8 px-3 text-[11px] font-medium uppercase tracking-[0.16em] text-white/35">Product & event</p>
      <nav className="space-y-1">
        {EVENTS.map((item) => (
          <NavLeaf key={item.to} item={item} pathname={pathname} search={search} onClick={close} />
        ))}
      </nav>

      <p className="mb-2 mt-8 px-3 text-[11px] font-medium uppercase tracking-[0.16em] text-white/35">Account</p>
      <nav className="space-y-1">
        {ACCOUNT.map((item) => (
          <NavLeaf key={item.to} item={item} pathname={pathname} search={search} onClick={close} />
        ))}
        <button
          type="button"
          onClick={() => void logout()}
          className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-medium text-white/60 hover:bg-white/8 hover:text-white"
        >
          <LogOut size={18} />
          Logout
        </button>
      </nav>
    </>
  );

  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none fixed inset-0" aria-hidden>
        <div className="admin-wash h-full w-full" />
        <div className="admin-mesh absolute inset-0" />
        <div className="admin-grain absolute inset-0" />
        <div className="admin-orb absolute -left-28 -top-36 h-[32rem] w-[32rem] rounded-full bg-peach/55 blur-3xl" />
        <div className="admin-orb-alt absolute -right-24 -top-24 h-[26rem] w-[26rem] rounded-full bg-pink/40 blur-3xl" />
        <div className="admin-orb absolute -bottom-28 right-[12%] h-[24rem] w-[24rem] rounded-full bg-peach-deep/35 blur-3xl" />
        <div className="admin-orb-alt absolute bottom-[-8rem] left-[18%] h-[20rem] w-[20rem] rounded-full bg-white/50 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 flex h-40 items-end justify-center gap-2 opacity-50 lg:pl-[16.5rem]">
          <span className="h-16 w-14 rounded-t-full bg-white/35" />
          <span className="h-24 w-16 rounded-t-full bg-peach/25" />
          <span className="h-32 w-[4.5rem] rounded-t-full bg-white/40" />
          <span className="h-24 w-16 rounded-t-full bg-pink/20" />
          <span className="h-16 w-14 rounded-t-full bg-white/35" />
        </div>
      </div>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[16.5rem] flex-col bg-ink px-4 py-6 lg:flex">
        <div className="px-2">
          <Logo tone="dark" className="[&_img]:h-8 [&_img]:max-w-[140px] sm:[&_img]:h-8" />
        </div>
        <div className="mt-10 flex-1 overflow-y-auto">{links}</div>
        <p className="mt-4 truncate px-2 text-xs text-white/40">{staff?.name}</p>
      </aside>

      <div className="relative lg:pl-[16.5rem]">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/40 bg-white/35 px-4 py-3 backdrop-blur-xl lg:hidden">
          <Logo />
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/70"
            aria-label="Open menu"
            onClick={() => setOpen(true)}
          >
            <Menu size={20} />
          </button>
        </header>

        {open ? (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button className="absolute inset-0 bg-ink/30" aria-label="Close menu" onClick={() => setOpen(false)} />
            <div className="relative flex h-full w-[16.5rem] flex-col overflow-y-auto bg-ink px-4 py-6">
              <div className="mb-8 flex items-center justify-between px-2">
                <Logo tone="dark" className="[&_img]:h-8" />
                <button type="button" className="h-11 w-11 text-white" aria-label="Close menu" onClick={() => setOpen(false)}>
                  <X className="mx-auto" />
                </button>
              </div>
              {links}
            </div>
          </div>
        ) : null}

        <div className="px-4 py-6 sm:px-8 lg:px-10 lg:py-8">
          <AdminKeepAlive />
        </div>
      </div>
    </div>
  );
}
