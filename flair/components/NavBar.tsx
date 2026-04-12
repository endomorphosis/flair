"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Search" },
  { href: "/about", label: "About" },
  { href: "/docs", label: "Docs" },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="bg-[#111] text-white print:hidden">
      <div className="max-w-5xl mx-auto px-6 flex items-center justify-between h-12">
        <Link href="/" className="text-base font-semibold tracking-widest uppercase hover:opacity-70 transition-opacity">
          FLAIR
        </Link>
        <div className="flex items-center gap-6">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`text-[13px] tracking-wide transition-opacity ${
                  isActive
                    ? "text-white font-medium"
                    : "text-neutral-500 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
