import { envConfig } from "./env.config";

export enum StorageKey {
  APP_CHAIN_ID = "app_chain_id",
  USER_THEME = "user_theme",
}

export interface StorageSchema {
  [StorageKey.APP_CHAIN_ID]: number;
  [StorageKey.USER_THEME]: "light" | "dark" | "system";
}

export const STORAGE_DEFAULTS: StorageSchema = {
  [StorageKey.APP_CHAIN_ID]: envConfig.app.defaultChain,
  [StorageKey.USER_THEME]: "system",
};
