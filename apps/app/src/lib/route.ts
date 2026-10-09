export const routes = {
  auth: {
    login: "/login",
  },
  app: {
    dashboard: "/",
    deposit: (positionId?: string) =>
      `/deposit${positionId ? `?position=${positionId}` : ""}`,
    repay: (positionId?: string) =>
      `/repay${positionId ? `?position=${positionId}` : ""}`,
    borrow: "/borrow",
    earn: "/earn",
    withdrawCollateral: (positionId?: string) =>
      `/withdraw/collateral${positionId ? `?position=${positionId}` : ""}`,
    positions: {
      index: "/positions",
      details: (positionId: string) => `/positions/${positionId}`,
    },
    settings: "/settings",
    admin: {
      mockFeed: "/admin/oracle",
      mockRegistry: "/admin/registry",
    },
  },
} as const;

const modalRoutes: string[] = [routes.app.deposit()];

export const isModalRoutes = (path: string) => {
  return modalRoutes.includes(path);
};
