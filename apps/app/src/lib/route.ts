export const routes = {
  auth: {
    login: "/login",
  },
  app: {
    dashboard: "/",
    deposit: "/deposit",
    borrow: "/borrow",
  },
} as const;

const modalRoutes: string[] = [routes.app.deposit];

export const isModalRoutes = (path: string) => {
  return modalRoutes.includes(path);
};
