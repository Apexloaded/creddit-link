"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NavigationMenuLink } from "@/components/ui/navigation-menu";
import { LucideIcon } from "lucide-react";
import DesktopNav from "./desktop-nav";
import MobileNav from "./mobile-nav";
import { navItems } from "./nav-items";

export type NavItem = {
  name: string;
  href: string;
  isProtected?: boolean;
  children?: {
    contents?: {
      title: string;
      description: string;
      href: string;
      icon: LucideIcon;
    }[];
    menus?: {
      title: string;
      items: { name: string; href: string }[];
    }[];
  };
};

export function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-lg transition-all duration-300 ${isScrolled
          ? "border-b border-line bg-paper/30"
          : "border-b border-transparent"
        }`}
      style={{
        backdropFilter: "blur(14px) saturate(1.4)",
        WebkitBackdropFilter: "blur(14px) saturate(1.4)",
      }}
    >
      <DesktopNav navItems={navItems} />
      <MobileNav navItems={navItems} />
    </nav>
  );
}

export function ListItem({
  title,
  children,
  className,
  href,
  ...props
}: React.ComponentPropsWithoutRef<"li"> & { href: string }) {
  return (
    <li {...props}>
      <NavigationMenuLink
        render={
          <Link href={href}>
            <div className="flex flex-col gap-1 text-sm">
              <div className="leading-none font-medium">{title}</div>
              <div className="line-clamp-2 text-muted-foreground">
                {children}
              </div>
            </div>
          </Link>
        }
        className={className}
      />
    </li>
  );
}
