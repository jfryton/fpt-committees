import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import Fastify from "fastify";
import { parse as parseCsv } from "csv-parse/sync";
import {
  type AuthExchangePayload,
  type BootstrapStatusPayload,
  type CommitteeUpsertPayload,
  type CreatedGrantPayload,
  type GrantCreatePayload,
  type SessionPayload,
} from "@fpt-committees/shared";
import { z } from "zod";
import { env } from "./config/env.js";
import { getStore } from "./repositories/store.js";
import { randomToken, sha256 } from "./utils/crypto.js";

const ExchangeSchema = z.object({
  token: z.string().min(1),
});

const GrantCreateSchema = z.object({
  displayName: z.string().min(1),
  role: z.enum(["viewer", "editor", "admin"]),
  scopeMode: z.enum(["all", "selected"]),
  committeeIds: z.array(z.string()).default([]),
  expiresAt: z.string().datetime().nullable(),
});

const CommitteePayloadSchema = z.object({
  committeeCode: z.string().min(1),
  nameEn: z.string().min(1),
  nameFr: z.string().min(1),
  federalCochair: z.string().min(1),
  ptCochair: z.string().min(1),
  mandateEn: z.string().min(1),
  mandateFr: z.string().min(1),
  meetingFrequencyEn: z.string().min(1),
  meetingFrequencyFr: z.string().min(1),
  secretariatEmail: z.string().email(),
});

const app = Fastify({
  logger: true,
});

await app.register(cors, {
  origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN,
  credentials: true,
});

await app.register(cookie, {
  secret: env.SESSION_SECRET,
});

app.decorateRequest("auth", null);

app.addHook("preHandler", async (request) => {
  const sessionToken = request.cookies[env.SESSION_COOKIE_NAME];
  if (!sessionToken) {
    request.auth = null;
    return;
  }

  const store = await getStore();
  const session = await store.findSessionByTokenHash(sha256(sessionToken));
  if (!session) {
    request.auth = null;
    return;
  }

  request.auth = {
    sessionId: session.session.id,
    grantId: session.actor.grantId,
    role: session.actor.role,
    allowedCommitteeIds: session.actor.allowedCommitteeIds,
  };
});

app.get("/health", async () => ({
  ok: true,
}));

app.get("/auth/session", async (request, reply): Promise<SessionPayload> => {
  if (!request.auth) {
    return {
      authenticated: false,
      actor: null,
    };
  }

  const store = await getStore();
  const sessionToken = request.cookies[env.SESSION_COOKIE_NAME];
  if (!sessionToken) {
    reply.clearCookie(env.SESSION_COOKIE_NAME);
    return {
      authenticated: false,
      actor: null,
    };
  }

  const session = await store.findSessionByTokenHash(sha256(sessionToken));
  if (!session) {
    reply.clearCookie(env.SESSION_COOKIE_NAME);
    return {
      authenticated: false,
      actor: null,
    };
  }

  return {
    authenticated: true,
    actor: session.actor,
  };
});

app.get("/auth/bootstrap", async (): Promise<BootstrapStatusPayload> => {
  const store = await getStore();
  const grant = await store.getBootstrapGrant();
  return {
    bootstrapAvailable: Boolean(grant),
  };
});

app.post("/auth/exchange", async (request, reply): Promise<AuthExchangePayload> => {
  const { token } = ExchangeSchema.parse(request.body ?? {});
  const store = await getStore();
  const grant = await store.findGrantByTokenHash(sha256(`${token}:${env.ACCESS_LINK_PEPPER}`));

  if (!grant || grant.status !== "active") {
    return reply.code(401).send({
      message: "Invalid access link.",
    });
  }

  if (grant.expiresAt && new Date(grant.expiresAt) <= new Date()) {
    return reply.code(401).send({
      message: "Access link expired.",
    });
  }

  const rawSessionToken = randomToken();
  const session = await store.createSession({
    tokenHash: sha256(rawSessionToken),
    grantId: grant.id,
    expiresAt: new Date(Date.now() + env.SESSION_TTL_HOURS * 60 * 60 * 1000).toISOString(),
  });

  await store.touchGrant(grant.id, new Date().toISOString());
  await store.writeAuditLog({
    action: "auth.exchange",
    actorGrantId: grant.id,
    actorSessionId: session.id,
    committeeId: null,
    targetType: "grant",
    targetId: grant.id,
    metadata: {},
  });

  reply.setCookie(env.SESSION_COOKIE_NAME, rawSessionToken, {
    httpOnly: true,
    sameSite: env.NODE_ENV === "production" ? "none" : "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: env.SESSION_TTL_HOURS * 60 * 60,
  });

  return {
    ok: true,
    actor: {
      grantId: grant.id,
      displayName: grant.displayName,
      role: grant.role,
      scopeMode: grant.scopeMode,
      allowedCommitteeIds: grant.allowedCommitteeIds,
    },
  };
});

app.post("/auth/bootstrap", async (request, reply): Promise<AuthExchangePayload | { message: string }> => {
  const store = await getStore();
  const grant = await store.getBootstrapGrant();

  if (!grant) {
    return reply.code(403).send({
      message: "Bootstrap is no longer available.",
    });
  }

  const rawSessionToken = randomToken();
  const session = await store.createSession({
    tokenHash: sha256(rawSessionToken),
    grantId: grant.id,
    expiresAt: new Date(Date.now() + env.SESSION_TTL_HOURS * 60 * 60 * 1000).toISOString(),
  });

  await store.touchGrant(grant.id, new Date().toISOString());
  await store.writeAuditLog({
    action: "auth.bootstrap",
    actorGrantId: grant.id,
    actorSessionId: session.id,
    committeeId: null,
    targetType: "grant",
    targetId: grant.id,
    metadata: {},
  });

  reply.setCookie(env.SESSION_COOKIE_NAME, rawSessionToken, {
    httpOnly: true,
    sameSite: env.NODE_ENV === "production" ? "none" : "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: env.SESSION_TTL_HOURS * 60 * 60,
  });

  return {
    ok: true,
    actor: {
      grantId: grant.id,
      displayName: grant.displayName,
      role: grant.role,
      scopeMode: grant.scopeMode,
      allowedCommitteeIds: grant.allowedCommitteeIds,
    },
  };
});

app.post("/auth/logout", async (request, reply) => {
  if (request.auth) {
    const store = await getStore();
    await store.revokeSession(request.auth.sessionId);
    await store.writeAuditLog({
      action: "auth.logout",
      actorGrantId: request.auth.grantId,
      actorSessionId: request.auth.sessionId,
      committeeId: null,
      targetType: "session",
      targetId: request.auth.sessionId,
      metadata: {},
    });
  }

  reply.clearCookie(env.SESSION_COOKIE_NAME, {
    sameSite: env.NODE_ENV === "production" ? "none" : "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
  });

  return reply.code(204).send();
});

app.get("/committees", async (request, reply) => {
  if (!request.auth) {
    return reply.code(401).send({ message: "Authentication required." });
  }

  const store = await getStore();
  return store.listCommittees({
    grantId: request.auth.grantId,
    displayName: "",
    role: request.auth.role,
    scopeMode: request.auth.allowedCommitteeIds === null ? "all" : "selected",
    allowedCommitteeIds: request.auth.allowedCommitteeIds,
  });
});

app.get("/committees/:committeeId", async (request, reply) => {
  if (!request.auth) {
    return reply.code(401).send({ message: "Authentication required." });
  }

  const params = z.object({ committeeId: z.string().min(1) }).parse(request.params);
  const store = await getStore();
  const committee = await store.getCommittee(
    {
      grantId: request.auth.grantId,
      displayName: "",
      role: request.auth.role,
      scopeMode: request.auth.allowedCommitteeIds === null ? "all" : "selected",
      allowedCommitteeIds: request.auth.allowedCommitteeIds,
    },
    params.committeeId,
  );

  if (!committee) {
    return reply.code(404).send({ message: "Committee not found." });
  }

  return committee;
});

app.put("/committees/:committeeId", async (request, reply) => {
  if (!request.auth) {
    return reply.code(401).send({ message: "Authentication required." });
  }

  const params = z.object({ committeeId: z.string().min(1) }).parse(request.params);
  const payload = CommitteePayloadSchema.parse(request.body ?? {}) as CommitteeUpsertPayload;
  const store = await getStore();
  const updated = await store.upsertCommittee(
    {
      grantId: request.auth.grantId,
      displayName: "",
      role: request.auth.role,
      scopeMode: request.auth.allowedCommitteeIds === null ? "all" : "selected",
      allowedCommitteeIds: request.auth.allowedCommitteeIds,
    },
    params.committeeId,
    payload,
  );

  if (!updated) {
    return reply.code(403).send({ message: "You do not have access to update this committee." });
  }

  await store.writeAuditLog({
    action: "committee.update",
    actorGrantId: request.auth.grantId,
    actorSessionId: request.auth.sessionId,
    committeeId: params.committeeId,
    targetType: "committee",
    targetId: params.committeeId,
    metadata: {
      committeeCode: payload.committeeCode,
    },
  });

  return updated;
});

app.get("/grants", async (request, reply) => {
  if (!request.auth || request.auth.role !== "admin") {
    return reply.code(403).send({ message: "Admin access required." });
  }

  const store = await getStore();
  return store.listGrants();
});

app.post("/grants", async (request, reply): Promise<CreatedGrantPayload | { message: string }> => {
  if (!request.auth || request.auth.role !== "admin") {
    return reply.code(403).send({ message: "Admin access required." });
  }

  const payload = GrantCreateSchema.parse(request.body ?? {}) as GrantCreatePayload;
  const rawGrantToken = randomToken(24);
  const tokenHash = sha256(`${rawGrantToken}:${env.ACCESS_LINK_PEPPER}`);
  const accessLink = `${env.APP_BASE_URL}#/` + `?token=${encodeURIComponent(rawGrantToken)}`;
  const store = await getStore();
  const created = await store.createGrant({
    payload,
    tokenHash,
    accessLink,
  });

  await store.writeAuditLog({
    action: "grant.create",
    actorGrantId: request.auth.grantId,
    actorSessionId: request.auth.sessionId,
    committeeId: null,
    targetType: "grant",
    targetId: created.grant.id,
    metadata: {
      role: created.grant.role,
      scopeMode: created.grant.scopeMode,
    },
  });

  return created;
});

app.post("/grants/:grantId/revoke", async (request, reply) => {
  if (!request.auth || request.auth.role !== "admin") {
    return reply.code(403).send({ message: "Admin access required." });
  }

  const params = z.object({ grantId: z.string().min(1) }).parse(request.params);
  const store = await getStore();
  const revoked = await store.revokeGrant(params.grantId);
  if (!revoked) {
    return reply.code(404).send({ message: "Grant not found." });
  }

  await store.writeAuditLog({
    action: "grant.revoke",
    actorGrantId: request.auth.grantId,
    actorSessionId: request.auth.sessionId,
    committeeId: null,
    targetType: "grant",
    targetId: revoked.id,
    metadata: {},
  });

  return revoked;
});

app.post("/imports/committees", async (request, reply) => {
  if (!request.auth || request.auth.role !== "admin") {
    return reply.code(403).send({ message: "Admin access required." });
  }

  const body = z.object({ csv: z.string().min(1) }).parse(request.body ?? {});
  parseCsv(body.csv, {
    columns: true,
    skip_empty_lines: true,
  });

  const store = await getStore();
  const result = await store.importCommittees(
    {
      grantId: request.auth.grantId,
      displayName: "",
      role: request.auth.role,
      scopeMode: request.auth.allowedCommitteeIds === null ? "all" : "selected",
      allowedCommitteeIds: request.auth.allowedCommitteeIds,
    },
    body.csv,
  );

  await store.writeAuditLog({
    action: "committee.import",
    actorGrantId: request.auth.grantId,
    actorSessionId: request.auth.sessionId,
    committeeId: null,
    targetType: "import",
    targetId: "csv",
    metadata: result,
  });

  return result;
});

app.get("/audit-logs", async (request, reply) => {
  if (!request.auth || request.auth.role !== "admin") {
    return reply.code(403).send({ message: "Admin access required." });
  }

  const query = z
    .object({
      committeeId: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(500).optional().default(100),
    })
    .parse(request.query ?? {});

  const store = await getStore();
  return store.listAuditLogs({
    committeeId: query.committeeId,
    limit: query.limit,
  });
});

app.setErrorHandler((error, _request, reply) => {
  app.log.error(error);
  if (error instanceof z.ZodError) {
    reply.code(400).send({
      message: error.issues.map((issue) => issue.message).join(", "),
    });
    return;
  }

  reply.code(500).send({
    message: "Internal server error.",
  });
});

const start = async () => {
  try {
    await app.listen({
      host: env.HOST,
      port: env.PORT,
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

await start();
