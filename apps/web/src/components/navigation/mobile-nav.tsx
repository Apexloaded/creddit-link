"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { MenuIcon, Wallet2Icon, XIcon } from "lucide-react";
import { NavItem } from ".";
import { routes } from "@/lib/route";

type MobileNavProps = {
  navItems: NavItem[];
};

function MobileNav({ navItems }: Readonly<MobileNavProps>) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [isOpen]);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div
      data-menu-open={isOpen}
      className="max-w-295 group mx-auto flex flex-col lg:hidden data-[menu-open=true]:h-screen data-[menu-open=true]:bg-secondary"
    >
      <div className="flex px-5 border-b py-6 items-center justify-between gap-5 w-full">
        <Link href="/">CredditLink</Link>
        <div className="flex items-center gap-3">
          <div className="flex">
            <Link
              href={routes.auth.register}
              rel="noopener noreferrer"
              className="text-[0.85rem] bg-foreground text-background font-medium px-4.5 py-2.25 border border-foreground rounded-full hover:bg-primary hover:border-primary hover:text-background transition-all duration-400"
            >
              Launch App
            </Link>
            <Link
              href={routes.auth.login}
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1 text-[0.85rem] font-medium px-4.5 py-2.25 ml-3 border border-foreground rounded-full hover:bg-secondary transition-all duration-400"
            >
              <Wallet2Icon size={18} />
              Connect
            </Link>
          </div>

          <button
            onClick={toggleMenu}
            aria-expanded={isOpen}
            aria-controls="mobile-menu"
          >
            {isOpen ? <XIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>
      <div
        id="mobile-menu"
        className={cn(
          "hidden flex-1 flex-col overflow-hidden",
          "group-data-[menu-open=true]:flex",
        )}
      >
        <Accordion className="w-full border-0 flex-1 overflow-y-auto rounded-none">
          {navItems.map((item) =>
            item.children ? (
              <AccordionItem
                value={item.name}
                key={item.name}
                className="border-none shadow-none first-of-type:pt-3"
              >
                <AccordionTrigger className="text-base font-sans shadow-none px-5 hover:no-underline">
                  {item.name}
                </AccordionTrigger>

                <AccordionContent className="[&_p:not(:last-child)]:mb-0">
                  {/* Featured cards */}
                  {item.children.contents && (
                    <div className="space-y-5 mb-6">
                      {item.children.contents.map((content) => (
                        <Link
                          key={content.title}
                          href={content.href}
                          className="flex gap-3 rounded-xl"
                        >
                          <div className="size-10 rounded-full bg-primary flex items-center justify-center">
                            <content.icon className="size-5 text-background" />
                          </div>

                          <div className="flex-1 flex flex-col gap-1">
                            <p className="font-medium">{content.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {content.description}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Menu groups */}
                  <div className="space-y-5 px-1">
                    {item.children.menus?.map((group) => (
                      <div key={group.title}>
                        <p className="mb-2 text-[12px] uppercase tracking-wide text-muted-foreground">
                          {group.title}
                        </p>

                        <div className="space-y-2">
                          {group.items.map((subItem) => (
                            <Link
                              key={subItem.name}
                              href={subItem.href}
                              className="block rounded-md py-2 hover:text-primary"
                            >
                              {subItem.name}
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ) : (
              <Link
                key={item.name}
                href={item.href}
                className="block px-5 font-medium py-4 text-base hover:text-primary"
              >
                {item.name}
              </Link>
            ),
          )}
        </Accordion>
        <div className="shrink-0 flex py-4 border-t px-5">
          <Link
            href={routes.auth.register}
            className="text-[0.85rem] text-center flex-1 shrink-0 bg-foreground text-background font-medium px-4.5 py-2.25 border border-foreground rounded-sm hover:bg-primary hover:border-primary hover:text-background transition-all duration-400"
          >
            Launch App
          </Link>
          <Link
            href={routes.auth.login}
            className="text-[0.85rem] text-center flex-1 shrink-0 font-medium px-4.5 py-2.25 ml-3 border border-foreground rounded-sm hover:bg-background transition-all duration-400"
          >
            Connect Wallet
          </Link>
        </div>
      </div>
    </div>
  );
}

export default MobileNav;
