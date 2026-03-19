import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  APP_BASE_URL: z.url(),
  SESSION_SECRET: z.string().min(16),
  ACCESS_LINK_PEPPER: z.string().min(16),
  SESSION_COOKIE_NAME: z.string().default("fpt_session"),
  INITIAL_ADMIN_TOKEN: z.string().min(16).default("initial-admin-access-link"),
  SESSION_TTL_HOURS: z.coerce.number().int().positive().default(12),
  CORS_ORIGIN: z.string().default("*"),
});

export type AppEnv = z.infer<typeof EnvSchema>;

export const env: AppEnv = EnvSchema.parse(process.env);
