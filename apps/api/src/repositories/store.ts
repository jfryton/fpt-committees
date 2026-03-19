import type { DataStore } from "./data-store.js";
import { createPostgresStore } from "./postgres-store.js";

let singleton: Promise<DataStore> | null = null;

export const getStore = (): Promise<DataStore> => {
  if (!singleton) {
    singleton = createPostgresStore();
  }

  return singleton;
};
