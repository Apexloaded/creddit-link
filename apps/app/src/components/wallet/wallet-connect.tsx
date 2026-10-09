'use client';

import { Button } from "../ui/button";
import { PlusIcon, Wallet2Icon } from "lucide-react";
import { routes } from "@/lib/route";
import Link from "next/link";
import { useConnection } from "wagmi";
import { Container } from "../ui/container";
import { NavUser } from "../navigation/nav-user";
import { NetworkSwitcher } from "./network-switcher";

export function WalletConnect() {
  const { isConnected } = useConnection();
  return (
    <Container>
      {!isConnected ? (
        <Button
          className="text-[0.85rem] bg-foreground text-background font-medium px-4.5 py-2.25 border border-foreground rounded-full hover:bg-primary hover:border-primary hover:text-background transition-all duration-400"
          render={<Link href={routes.auth.login} />}
        >
          <Wallet2Icon />
          Connect
        </Button>
      ) : (
        <div className="flex items-center gap-1">
          <Button size={'icon'} variant={'secondary'}>
            <PlusIcon />
          </Button>
          <NetworkSwitcher />
          <NavUser />
        </div>
      )}
    </Container>

  );
}
