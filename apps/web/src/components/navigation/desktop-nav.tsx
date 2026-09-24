"use client";

import { Fragment } from "react";
import Link from "next/link";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";
import { ListItem, NavItem } from ".";
import { routes } from "@/lib/route";
import { Wallet2Icon } from "lucide-react";

type DesktopNavProps = {
  navItems: NavItem[];
};

function DesktopNav({ navItems }: Readonly<DesktopNavProps>) {
  return (
    <div className="wrap mx-auto px-5 py-4.5 hidden lg:flex items-center justify-between">
      <Link href="/">CredditLink</Link>

      <NavigationMenu className="hidden lg:flex">
        <NavigationMenuList className={"gap-5"}>
          {navItems.map((item, index) => (
            <NavigationMenuItem key={index} className={"hover:text-primary"}>
              {item.children ? (
                <Fragment>
                  <NavigationMenuTrigger className="px-0 bg-hover:bg-transparent">
                    {item.name}
                  </NavigationMenuTrigger>
                  <NavigationMenuContent className="p-0 overflow-hidden rounded-2xl border border-line bg-background shadow-lg">
                    <div className="flex">
                      {item.children?.contents?.length && (
                        <div className="bg-background p-8 w-96 flex-1">
                          <ul className="gap-5 flex flex-col">
                            {item.children.contents?.map(
                              (content, contentIndex) => (
                                <li key={contentIndex} className="p-0">
                                  <NavigationMenuLink
                                    render={
                                      <Link
                                        href={""}
                                        className="items-start gap-4"
                                      >
                                        <div className="size-13 flex items-center justify-center rounded-full bg-primary">
                                          <content.icon className="size-6 text-background group-hover:scale-125 transition-all duration-300 m-auto" />
                                        </div>
                                        <div className="flex-1 flex flex-col gap-2 text-sm">
                                          <div className="leading-none transition-all duration-100 group-hover:text-primary font-medium">
                                            {content.title}
                                          </div>
                                          <div className="line-clamp-3 text-muted-foreground">
                                            {content.description}
                                          </div>
                                        </div>
                                      </Link>
                                    }
                                    className={"p-0 group"}
                                  />
                                </li>
                              ),
                            )}
                          </ul>
                        </div>
                      )}

                      {item.children.menus && (
                        <div
                          className={cn(
                            "p-8",
                            item.children?.contents?.length
                              ? "bg-secondary"
                              : "bg-background",
                          )}
                        >
                          {item.children.menus.map((menu, menuIndex) => (
                            <ul
                              key={menuIndex}
                              className="mb-8 flex flex-col gap-3 last:mb-0"
                            >
                              <p className="text-[10px] text-muted-foreground font-medium pb-1 uppercase">
                                {menu.title}
                              </p>
                              {menu.items.map((subItem, subIndex) => (
                                <ListItem
                                  key={`${subItem.name}-${subIndex}`}
                                  href={subItem.href}
                                  title={subItem.name}
                                  className="p-0 hover:bg-transparent hover:*:text-primary"
                                />
                              ))}
                            </ul>
                          ))}
                        </div>
                      )}
                    </div>
                  </NavigationMenuContent>
                </Fragment>
              ) : (
                <NavigationMenuLink
                  className={cn(
                    navigationMenuTriggerStyle(),
                    "hover:bg-transparent focus:bg-transparent px-0",
                  )}
                  render={<Link href={item.href}>{item.name}</Link>}
                />
              )}
            </NavigationMenuItem>
          ))}
        </NavigationMenuList>
      </NavigationMenu>
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
          className="hidden sm:flex items-center gap-1 text-[0.85rem] font-medium px-4.5 py-2.25 ml-3 border border-foreground rounded-full hover:bg-background transition-all duration-400"
        >
          <Wallet2Icon size={18} />
          Connect
        </Link>
      </div>
    </div>
  );
}

export default DesktopNav;
