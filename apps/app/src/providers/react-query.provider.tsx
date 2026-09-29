"use client";

import React from "react";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createIDBPersister } from "@/lib/persister";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: 1000 * 60 * 60 * 24, // cache kept in memory for 24hrs after unmount
        staleTime: 1000 * 30, // data considered fresh for 30 sec globally
        refetchOnWindowFocus: true,
        refetchOnReconnect: true, // refetch when network comes back
        retry: (failureCount, error: any) => {
          // don't retry on 4xx errors, only on network failures
          if (error?.status >= 400 && error?.status < 500) return false;
          return failureCount < 2;
        },
      },
      mutations: {
        retry: 0, // never retry mutations
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

// Singleton on client, fresh instance on server (for SSR safety)
function getQueryClient() {
  if (typeof window === "undefined") return makeQueryClient();
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}

const persister = createIDBPersister();

export default function ReactQueryProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const queryClient = getQueryClient();

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 1000 * 60 * 60 * 24,
        buster: process.env.NEXT_PUBLIC_APP_VERSION,
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => {
            // Only persist queries that opt in via meta.persist
            return (
              query.meta?.persist === true && query.state.status === "success"
            );
          },
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
