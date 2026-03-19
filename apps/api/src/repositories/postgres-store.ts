import { parse } from "csv-parse/sync";
import { and, asc, desc, eq, gt, inArray, isNull, or } from "drizzle-orm";
import type {
  AccessGrant,
  CommitteeRecord,
  CommitteeUpsertPayload,
  CreatedGrantPayload,
  GrantCreatePayload,
  SessionActor,
} from "@fpt-committees/shared";
import { env } from "../config/env.js";
import { db } from "../db/client.js";
import {
  accessGrants,
  auditLogs,
  committees,
  grantCommitteeScopes,
  importJobs,
  sessions,
} from "../db/schema.js";
import { sha256 } from "../utils/crypto.js";
import { newId } from "../utils/ids.js";
import type { AuditEntry, DataStore, GrantRecord, SessionLookup, SessionRecord } from "./data-store.js";
import { canReadCommittee, canWriteCommittee, normalizeGrant } from "./data-store.js";

const now = () => new Date();
const nowIso = () => now().toISOString();

const committeeToRecord = (row: typeof committees.$inferSelect): CommitteeRecord => ({
  id: row.id,
  committeeCode: row.committeeCode,
  nameEn: row.nameEn,
  nameFr: row.nameFr,
  federalCochair: row.federalCochair,
  ptCochair: row.ptCochair,
  mandateEn: row.mandateEn,
  mandateFr: row.mandateFr,
  meetingFrequencyEn: row.meetingFrequencyEn,
  meetingFrequencyFr: row.meetingFrequencyFr,
  secretariatEmail: row.secretariatEmail,
  updatedAt: row.updatedAt.toISOString(),
});

const toSessionActor = (
  grant: {
    id: string;
    displayName: string;
    role: "viewer" | "editor" | "admin";
    scopeMode: "all" | "selected";
  },
  allowedCommitteeIds: string[] | null,
): SessionActor => ({
  grantId: grant.id,
  displayName: grant.displayName,
  role: grant.role,
  scopeMode: grant.scopeMode,
  allowedCommitteeIds,
});

const toSessionRecord = (row: typeof sessions.$inferSelect): SessionRecord => ({
  id: row.id,
  tokenHash: row.tokenHash,
  grantId: row.grantId,
  expiresAt: row.expiresAt.toISOString(),
  revokedAt: row.revokedAt?.toISOString() ?? null,
  createdAt: row.createdAt.toISOString(),
  lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
});

const getGrantScopes = async (grantId: string, scopeMode: "all" | "selected"): Promise<string[] | null> => {
  if (scopeMode === "all") {
    return null;
  }

  const rows = await db
    .select({ committeeId: grantCommitteeScopes.committeeId })
    .from(grantCommitteeScopes)
    .where(eq(grantCommitteeScopes.grantId, grantId));
  return rows.map((row) => row.committeeId);
};

export class PostgresStore implements DataStore {
  async seed(): Promise<void> {
    return;
  }

  async findGrantByTokenHash(tokenHash: string): Promise<GrantRecord | null> {
    const [grant] = await db
      .select()
      .from(accessGrants)
      .where(eq(accessGrants.tokenHash, tokenHash))
      .limit(1);

    if (!grant) {
      return null;
    }

    const allowedCommitteeIds = await getGrantScopes(grant.id, grant.scopeMode);
    return {
      id: grant.id,
      tokenHash: grant.tokenHash,
      displayName: grant.displayName,
      role: grant.role,
      scopeMode: grant.scopeMode,
      status: grant.status,
      expiresAt: grant.expiresAt?.toISOString() ?? null,
      lastUsedAt: grant.lastUsedAt?.toISOString() ?? null,
      createdAt: grant.createdAt.toISOString(),
      revokedAt: grant.revokedAt?.toISOString() ?? null,
      allowedCommitteeIds,
    };
  }

  async createSession(input: {
    tokenHash: string;
    grantId: string;
    expiresAt: string;
  }): Promise<SessionRecord> {
    const [created] = await db
      .insert(sessions)
      .values({
        id: newId("ses"),
        tokenHash: input.tokenHash,
        grantId: input.grantId,
        expiresAt: new Date(input.expiresAt),
        lastUsedAt: now(),
      })
      .returning();
    return toSessionRecord(created);
  }

  async touchGrant(grantId: string, timestamp: string): Promise<void> {
    await db
      .update(accessGrants)
      .set({ lastUsedAt: new Date(timestamp) })
      .where(eq(accessGrants.id, grantId));
  }

  async touchSession(sessionId: string, timestamp: string): Promise<void> {
    await db
      .update(sessions)
      .set({ lastUsedAt: new Date(timestamp) })
      .where(eq(sessions.id, sessionId));
  }

  async revokeSession(sessionId: string): Promise<void> {
    await db
      .update(sessions)
      .set({ revokedAt: now() })
      .where(eq(sessions.id, sessionId));
  }

  async findSessionByTokenHash(tokenHash: string): Promise<SessionLookup | null> {
    const [record] = await db
      .select({
        session: sessions,
        grant: accessGrants,
      })
      .from(sessions)
      .innerJoin(accessGrants, eq(sessions.grantId, accessGrants.id))
      .where(
        and(
          eq(sessions.tokenHash, tokenHash),
          isNull(sessions.revokedAt),
          gt(sessions.expiresAt, now()),
          eq(accessGrants.status, "active"),
          isNull(accessGrants.revokedAt),
          or(isNull(accessGrants.expiresAt), gt(accessGrants.expiresAt, now())),
        ),
      )
      .limit(1);

    if (!record) {
      return null;
    }

    const allowedCommitteeIds = await getGrantScopes(record.grant.id, record.grant.scopeMode);
    return {
      actor: toSessionActor(record.grant, allowedCommitteeIds),
      session: toSessionRecord(record.session),
    };
  }

  async listCommittees(actor: SessionActor): Promise<CommitteeRecord[]> {
    const rows =
      actor.allowedCommitteeIds === null
        ? await db
            .select()
            .from(committees)
            .where(eq(committees.archived, false))
            .orderBy(asc(committees.committeeCode))
        : actor.allowedCommitteeIds.length === 0
          ? []
          : await db
              .select()
              .from(committees)
              .where(
                and(
                  eq(committees.archived, false),
                  inArray(committees.id, actor.allowedCommitteeIds),
                ),
              )
              .orderBy(asc(committees.committeeCode));

    return rows.map(committeeToRecord).filter((entry) => canReadCommittee(actor, entry.id));
  }

  async getCommittee(actor: SessionActor, committeeId: string): Promise<CommitteeRecord | null> {
    if (!canReadCommittee(actor, committeeId)) {
      return null;
    }

    const [row] = await db
      .select()
      .from(committees)
      .where(and(eq(committees.id, committeeId), eq(committees.archived, false)))
      .limit(1);
    return row ? committeeToRecord(row) : null;
  }

  async upsertCommittee(
    actor: SessionActor,
    committeeId: string,
    payload: CommitteeUpsertPayload,
  ): Promise<CommitteeRecord | null> {
    if (!canWriteCommittee(actor, committeeId)) {
      return null;
    }

    const [existing] = await db.select().from(committees).where(eq(committees.id, committeeId)).limit(1);
    if (!existing) {
      return null;
    }

    const [updated] = await db
      .update(committees)
      .set({
        committeeCode: payload.committeeCode,
        nameEn: payload.nameEn,
        nameFr: payload.nameFr,
        federalCochair: payload.federalCochair,
        ptCochair: payload.ptCochair,
        mandateEn: payload.mandateEn,
        mandateFr: payload.mandateFr,
        meetingFrequencyEn: payload.meetingFrequencyEn,
        meetingFrequencyFr: payload.meetingFrequencyFr,
        secretariatEmail: payload.secretariatEmail,
        updatedAt: now(),
      })
      .where(eq(committees.id, committeeId))
      .returning();

    return updated ? committeeToRecord(updated) : null;
  }

  async listGrants(): Promise<AccessGrant[]> {
    const rows = await db
      .select()
      .from(accessGrants)
      .orderBy(desc(accessGrants.createdAt));
    return rows.map((row) =>
      normalizeGrant({
        id: row.id,
        displayName: row.displayName,
        role: row.role,
        scopeMode: row.scopeMode,
        status: row.status,
        expiresAt: row.expiresAt?.toISOString() ?? null,
        lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
        revokedAt: row.revokedAt?.toISOString() ?? null,
      }),
    );
  }

  async createGrant(input: {
    payload: GrantCreatePayload;
    tokenHash: string;
    accessLink: string;
  }): Promise<CreatedGrantPayload> {
    const grantId = newId("grt");

    await db.transaction(async (tx) => {
      await tx.insert(accessGrants).values({
        id: grantId,
        tokenHash: input.tokenHash,
        displayName: input.payload.displayName,
        role: input.payload.role,
        scopeMode: input.payload.scopeMode,
        status: "active",
        expiresAt: input.payload.expiresAt ? new Date(input.payload.expiresAt) : null,
      });

      if (input.payload.scopeMode === "selected" && input.payload.committeeIds.length > 0) {
        await tx.insert(grantCommitteeScopes).values(
          input.payload.committeeIds.map((committeeId) => ({
            grantId,
            committeeId,
          })),
        );
      }
    });

    const [created] = await db.select().from(accessGrants).where(eq(accessGrants.id, grantId)).limit(1);
    if (!created) {
      throw new Error("grant creation failed");
    }

    return {
      grant: normalizeGrant({
        id: created.id,
        displayName: created.displayName,
        role: created.role,
        scopeMode: created.scopeMode,
        status: created.status,
        expiresAt: created.expiresAt?.toISOString() ?? null,
        lastUsedAt: created.lastUsedAt?.toISOString() ?? null,
        createdAt: created.createdAt.toISOString(),
        revokedAt: created.revokedAt?.toISOString() ?? null,
      }),
      accessLink: input.accessLink,
    };
  }

  async revokeGrant(grantId: string): Promise<AccessGrant | null> {
    const [revoked] = await db
      .update(accessGrants)
      .set({
        status: "revoked",
        revokedAt: now(),
        revokeReason: "revoked_by_admin",
      })
      .where(eq(accessGrants.id, grantId))
      .returning();

    if (!revoked) {
      return null;
    }

    await db
      .update(sessions)
      .set({ revokedAt: now() })
      .where(eq(sessions.grantId, grantId));

    return normalizeGrant({
      id: revoked.id,
      displayName: revoked.displayName,
      role: revoked.role,
      scopeMode: revoked.scopeMode,
      status: revoked.status,
      expiresAt: revoked.expiresAt?.toISOString() ?? null,
      lastUsedAt: revoked.lastUsedAt?.toISOString() ?? null,
      createdAt: revoked.createdAt.toISOString(),
      revokedAt: revoked.revokedAt?.toISOString() ?? null,
    });
  }

  async importCommittees(
    actor: SessionActor,
    csvText: string,
  ): Promise<{ inserted: number; updated: number }> {
    if (actor.role !== "admin") {
      return { inserted: 0, updated: 0 };
    }

    const importId = newId("imp");
    await db.insert(importJobs).values({
      id: importId,
      status: "running",
      createdByGrantId: actor.grantId,
      summary: {},
    });

    try {
      const records = parse(csvText, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }) as CommitteeUpsertPayload[];

      let inserted = 0;
      let updated = 0;

      for (const row of records) {
        const existing = await db
          .select({ id: committees.id })
          .from(committees)
          .where(eq(committees.committeeCode, row.committeeCode))
          .limit(1);

        if (existing.length > 0) {
          const id = existing[0].id;
          await db
            .update(committees)
            .set({
              committeeCode: row.committeeCode,
              nameEn: row.nameEn,
              nameFr: row.nameFr,
              federalCochair: row.federalCochair,
              ptCochair: row.ptCochair,
              mandateEn: row.mandateEn,
              mandateFr: row.mandateFr,
              meetingFrequencyEn: row.meetingFrequencyEn,
              meetingFrequencyFr: row.meetingFrequencyFr,
              secretariatEmail: row.secretariatEmail,
              updatedAt: now(),
            })
            .where(eq(committees.id, id));
          updated += 1;
        } else {
          await db.insert(committees).values({
            id: newId("com"),
            committeeCode: row.committeeCode,
            nameEn: row.nameEn,
            nameFr: row.nameFr,
            federalCochair: row.federalCochair,
            ptCochair: row.ptCochair,
            mandateEn: row.mandateEn,
            mandateFr: row.mandateFr,
            meetingFrequencyEn: row.meetingFrequencyEn,
            meetingFrequencyFr: row.meetingFrequencyFr,
            secretariatEmail: row.secretariatEmail,
            archived: false,
          });
          inserted += 1;
        }
      }

      await db
        .update(importJobs)
        .set({
          status: "completed",
          summary: { inserted, updated },
          completedAt: now(),
        })
        .where(eq(importJobs.id, importId));

      return { inserted, updated };
    } catch (error) {
      await db
        .update(importJobs)
        .set({
          status: "failed",
          errorMessage: error instanceof Error ? error.message : "unknown import error",
          completedAt: now(),
        })
        .where(eq(importJobs.id, importId));
      throw error;
    }
  }

  async listAuditLogs(input?: { committeeId?: string; limit?: number }): Promise<AuditEntry[]> {
    const limit = Math.min(Math.max(input?.limit ?? 100, 1), 500);
    const rows =
      input?.committeeId !== undefined
        ? await db
            .select()
            .from(auditLogs)
            .where(eq(auditLogs.committeeId, input.committeeId))
            .orderBy(desc(auditLogs.createdAt))
            .limit(limit)
        : await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit);

    return rows.map((row) => ({
      id: row.id,
      action: row.action,
      actorGrantId: row.actorGrantId,
      actorSessionId: row.actorSessionId,
      committeeId: row.committeeId,
      targetType: row.targetType,
      targetId: row.targetId,
      metadata: (row.metadata ?? {}) as Record<string, unknown>,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async writeAuditLog(entry: Omit<AuditEntry, "id" | "createdAt">): Promise<void> {
    await db.insert(auditLogs).values({
      action: entry.action,
      actorGrantId: entry.actorGrantId,
      actorSessionId: entry.actorSessionId,
      committeeId: entry.committeeId,
      targetType: entry.targetType,
      targetId: entry.targetId,
      metadata: entry.metadata,
      createdAt: now(),
    });
  }
}

export const createPostgresStore = async (): Promise<PostgresStore> => {
  const store = new PostgresStore();

  const [grantCount] = await db.select({ count: accessGrants.id }).from(accessGrants);
  if (!grantCount?.count && !env.ACCESS_LINK_PEPPER.startsWith("change-me")) {
    const initialAdminTokenHash = sha256(`${env.INITIAL_ADMIN_TOKEN}:${env.ACCESS_LINK_PEPPER}`);
    await store.createGrant({
      payload: {
        displayName: "Initial Admin",
        role: "admin",
        scopeMode: "all",
        committeeIds: [],
        expiresAt: null,
      },
      tokenHash: initialAdminTokenHash,
      accessLink: `${env.APP_BASE_URL}#/?token=${encodeURIComponent(env.INITIAL_ADMIN_TOKEN)}`,
    });
  }

  return store;
};
