export type CommitteeRecord = {
  id: string;
  committeeCode: string;
  nameEn: string;
  nameFr: string;
  federalCochair: string;
  ptCochair: string;
  mandateEn: string;
  mandateFr: string;
  meetingFrequencyEn: string;
  meetingFrequencyFr: string;
  secretariatEmail: string;
  updatedAt: string;
};

export type GrantRole = "viewer" | "editor" | "admin";

export type GrantScopeMode = "all" | "selected";

export type GrantStatus = "active" | "revoked";

export type AccessGrant = {
  id: string;
  displayName: string;
  role: GrantRole;
  scopeMode: GrantScopeMode;
  status: GrantStatus;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  revokedAt: string | null;
};

export type SessionExchangeResult = {
  sessionToken: string;
  expiresInHours: number;
  role: GrantRole;
  allowedCommitteeIds: string[] | null;
};

export type AuditLogEntry = {
  id: number;
  action: string;
  actorGrantId: string | null;
  actorSessionId: string | null;
  committeeId: string | null;
  targetType: string;
  targetId: string | null;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};

export type SessionActor = {
  grantId: string;
  displayName: string;
  role: GrantRole;
  scopeMode: GrantScopeMode;
  allowedCommitteeIds: string[] | null;
};

export type SessionPayload = {
  authenticated: boolean;
  actor: SessionActor | null;
};

export type BootstrapStatusPayload = {
  bootstrapAvailable: boolean;
};

export type AuthExchangePayload = {
  ok: true;
  actor: SessionActor;
};

export type CommitteeUpsertPayload = Pick<
  CommitteeRecord,
  | "committeeCode"
  | "nameEn"
  | "nameFr"
  | "federalCochair"
  | "ptCochair"
  | "mandateEn"
  | "mandateFr"
  | "meetingFrequencyEn"
  | "meetingFrequencyFr"
  | "secretariatEmail"
>;

export type GrantCreatePayload = {
  displayName: string;
  role: GrantRole;
  scopeMode: GrantScopeMode;
  committeeIds: string[];
  expiresAt: string | null;
};

export type CreatedGrantPayload = {
  grant: AccessGrant;
  accessLink: string;
};
