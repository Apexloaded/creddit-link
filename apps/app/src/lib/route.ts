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
  },
} as const;

const modalRoutes: string[] = [routes.app.deposit()];

export const isModalRoutes = (path: string) => {
  return modalRoutes.includes(path);
};
