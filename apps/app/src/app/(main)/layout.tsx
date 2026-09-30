"use client";

import { AppHeader } from "@/components/navigation/app-header";
import { AppSidebar } from "@/components/navigation/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { routes } from "@/lib/route";
import { usePathname } from "next/navigation";

export default function MainLayout({
  children,
  actions,
}: {
  children: React.ReactNode;
  actions: React.ReactNode;
}) {
  const path = usePathname();

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="overflow-hidden h-svh">
        {path !== routes.auth.login && <AppHeader />}

        {/* Always render main page content */}
        {children}

        {/* Always render parallel modal slot (renders null when no modal is active) */}
        {actions}
      </SidebarInset>
    </SidebarProvider>
  );
}
