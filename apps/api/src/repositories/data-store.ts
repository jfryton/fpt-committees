import type {
  AccessGrant,
  CommitteeRecord,
  CommitteeUpsertPayload,
  CreatedGrantPayload,
  GrantCreatePayload,
  GrantRole,
  GrantScopeMode,
  GrantStatus,
  SessionActor,
} from "@fpt-committees/shared";

export type SessionRecord = {
  id: string;
  tokenHash: string;
  grantId: string;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
  lastUsedAt: string | null;
};

export type GrantRecord = AccessGrant & {
  tokenHash: string;
  allowedCommitteeIds: string[] | null;
};

export type AuditEntry = {
  id: number;
  action: string;
  actorGrantId: string | null;
  actorSessionId: string | null;
  committeeId: string | null;
  targetType: string;
  targetId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type ImportSummary = {
  inserted: number;
  updated: number;
};

export type SessionLookup = {
  actor: SessionActor;
  session: SessionRecord;
};

export interface DataStore {
  seed(): Promise<void>;
  findGrantByTokenHash(tokenHash: string): Promise<GrantRecord | null>;
  getBootstrapGrant(): Promise<GrantRecord | null>;
  createSession(input: {
    tokenHash: string;
    grantId: string;
    expiresAt: string;
  }): Promise<SessionRecord>;
  touchGrant(grantId: string, timestamp: string): Promise<void>;
  touchSession(sessionId: string, timestamp: string): Promise<void>;
  revokeSession(sessionId: string): Promise<void>;
  findSessionByTokenHash(tokenHash: string): Promise<SessionLookup | null>;
  listCommittees(actor: SessionActor): Promise<CommitteeRecord[]>;
  getCommittee(actor: SessionActor, committeeId: string): Promise<CommitteeRecord | null>;
  upsertCommittee(
    actor: SessionActor,
    committeeId: string,
    payload: CommitteeUpsertPayload,
  ): Promise<CommitteeRecord | null>;
  listGrants(): Promise<AccessGrant[]>;
  createGrant(input: {
    payload: GrantCreatePayload;
    tokenHash: string;
    accessLink: string;
  }): Promise<CreatedGrantPayload>;
  revokeGrant(grantId: string): Promise<AccessGrant | null>;
  importCommittees(actor: SessionActor, csvText: string): Promise<ImportSummary>;
  listAuditLogs(input?: {
    committeeId?: string;
    limit?: number;
  }): Promise<AuditEntry[]>;
  writeAuditLog(entry: Omit<AuditEntry, "id" | "createdAt">): Promise<void>;
}

export const canReadCommittee = (actor: SessionActor, committeeId: string): boolean => {
  if (actor.allowedCommitteeIds === null) {
    return true;
  }

  return actor.allowedCommitteeIds.includes(committeeId);
};

export const canWriteCommittee = (actor: SessionActor, committeeId: string): boolean => {
  if (actor.role === "admin") {
    return true;
  }

  if (actor.role !== "editor") {
    return false;
  }

  return canReadCommittee(actor, committeeId);
};

export const normalizeGrant = (
  grant: {
    id: string;
    displayName: string;
    role: GrantRole;
    scopeMode: GrantScopeMode;
    status: GrantStatus;
    expiresAt: string | null;
    lastUsedAt: string | null;
    createdAt: string;
    revokedAt: string | null;
  },
): AccessGrant => ({
  id: grant.id,
  displayName: grant.displayName,
  role: grant.role,
  scopeMode: grant.scopeMode,
  status: grant.status,
  expiresAt: grant.expiresAt,
  lastUsedAt: grant.lastUsedAt,
  createdAt: grant.createdAt,
  revokedAt: grant.revokedAt,
});
