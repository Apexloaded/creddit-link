"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment } from "react";
import { NavGroup } from "./nav-items";

interface NavMainProps {
  groups: readonly NavGroup[];
}

export function NavMain({ groups }: NavMainProps) {
  const router = useRouter();

  const goToLink = (url: string) => {
    router.push(url);
  };

  return (
    <Fragment>
      {groups.map((group, groupIndex) => (
        <SidebarGroup key={group.label || groupIndex}>
          {group.label && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
          <SidebarMenu>
            {group.items.map((item) => {
              const label = item.title || item.name || "";
              const IconComponent = item.icon;
              const hasSubItems = item.items && item.items.length > 0;

              if (hasSubItems) {
                return (
                  <Collapsible
                    key={label}
                    defaultOpen={item.isActive}
                    className="group/collapsible"
                    render={<SidebarMenuItem />}
                  >
                    <CollapsibleTrigger
                      render={<SidebarMenuButton tooltip={label} />}
                    >
                      {IconComponent && <IconComponent className="size-4" />}
                      <span>{label}</span>
                      <ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-open/collapsible:rotate-90" />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.items?.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton
                              render={<Link href={subItem.url} />}
                            >
                              <span>{subItem.title}</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </Collapsible>
                );
              }
              return (
                <SidebarMenuItem key={label}>
                  <SidebarMenuButton
                    tooltip={label}
                    render={<Link href={item.url} />}
                  >
                    {IconComponent && <IconComponent className="size-4" />}
                    <span>{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </Fragment>
  );
}
