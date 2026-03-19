import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const grantRoleEnum = pgEnum("grant_role", ["viewer", "editor", "admin"]);
export const grantScopeModeEnum = pgEnum("grant_scope_mode", ["all", "selected"]);
export const grantStatusEnum = pgEnum("grant_status", ["active", "revoked"]);
export const importJobStatusEnum = pgEnum("import_job_status", [
  "queued",
  "running",
  "completed",
  "failed",
]);

export const committees = pgTable(
  "committees",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    committeeCode: varchar("committee_code", { length: 64 }).notNull().unique(),
    nameEn: text("name_en").notNull(),
    nameFr: text("name_fr").notNull(),
    federalCochair: text("federal_cochair").notNull(),
    ptCochair: text("pt_cochair").notNull(),
    mandateEn: text("mandate_en").notNull(),
    mandateFr: text("mandate_fr").notNull(),
    meetingFrequencyEn: text("meeting_frequency_en").notNull(),
    meetingFrequencyFr: text("meeting_frequency_fr").notNull(),
    secretariatEmail: text("secretariat_email").notNull(),
    archived: boolean("archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("committees_archived_idx").on(table.archived)],
);

export const accessGrants = pgTable(
  "access_grants",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tokenHash: varchar("token_hash", { length: 128 }).notNull().unique(),
    displayName: text("display_name").notNull(),
    role: grantRoleEnum("role").notNull(),
    scopeMode: grantScopeModeEnum("scope_mode").notNull(),
    status: grantStatusEnum("status").notNull().default("active"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revokeReason: text("revoke_reason"),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("access_grants_status_idx").on(table.status),
    index("access_grants_expires_at_idx").on(table.expiresAt),
  ],
);

export const grantCommitteeScopes = pgTable(
  "grant_committee_scopes",
  {
    grantId: varchar("grant_id", { length: 64 })
      .notNull()
      .references(() => accessGrants.id, { onDelete: "cascade" }),
    committeeId: varchar("committee_id", { length: 64 })
      .notNull()
      .references(() => committees.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.grantId, table.committeeId] }),
    index("grant_committee_scopes_committee_idx").on(table.committeeId),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tokenHash: varchar("token_hash", { length: 128 }).notNull().unique(),
    grantId: varchar("grant_id", { length: 64 })
      .notNull()
      .references(() => accessGrants.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    createdByIp: text("created_by_ip"),
    userAgent: text("user_agent"),
  },
  (table) => [
    index("sessions_grant_id_idx").on(table.grantId),
    index("sessions_expires_at_idx").on(table.expiresAt),
  ],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    action: text("action").notNull(),
    actorGrantId: varchar("actor_grant_id", { length: 64 }).references(() => accessGrants.id, {
      onDelete: "set null",
    }),
    actorSessionId: varchar("actor_session_id", { length: 64 }).references(() => sessions.id, {
      onDelete: "set null",
    }),
    committeeId: varchar("committee_id", { length: 64 }).references(() => committees.id, {
      onDelete: "set null",
    }),
    targetType: text("target_type").notNull(),
    targetId: text("target_id"),
    metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("audit_logs_action_idx").on(table.action),
    index("audit_logs_created_at_idx").on(table.createdAt),
    index("audit_logs_committee_id_idx").on(table.committeeId),
  ],
);

export const importJobs = pgTable(
  "import_jobs",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    status: importJobStatusEnum("status").notNull().default("queued"),
    sourceType: text("source_type").notNull().default("csv"),
    createdByGrantId: varchar("created_by_grant_id", { length: 64 }).references(
      () => accessGrants.id,
      { onDelete: "set null" },
    ),
    summary: jsonb("summary").notNull().default(sql`'{}'::jsonb`),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [index("import_jobs_status_idx").on(table.status)],
);
