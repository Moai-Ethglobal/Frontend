import Link from "next/link";
import { HeaderAuth } from "./HeaderAuth";

type NavItem = {
  href: string;
  label: string;
};

export function SiteHeader({
  brandHref = "/",
  brandLabel = "Moai",
  nav = [
    { href: "/moai", label: "My Moai" },
    { href: "/learn", label: "Learn" },
  ],
}: {
  brandHref?: string;
  brandLabel?: string;
  nav?: NavItem[];
}) {
  return (
    <header className="flex items-center justify-between">
      <Link className="text-sm font-medium text-neutral-900" href={brandHref}>
        {brandLabel}
      </Link>
      <nav className="flex items-center gap-4 text-sm">
        {nav.map((item) => (
          <Link
            className="text-neutral-700 hover:text-neutral-950"
            href={item.href}
            key={item.href}
          >
            {item.label}
          </Link>
        ))}
        <HeaderAuth />
      </nav>
    </header>
  );
}
