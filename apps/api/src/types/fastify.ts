import type { GrantRole } from "@fpt-committees/shared";

export type SessionAuthContext = {
  sessionId: string;
  grantId: string;
  role: GrantRole;
  allowedCommitteeIds: string[] | null;
};

declare module "fastify" {
  interface FastifyRequest {
    auth: SessionAuthContext | null;
  }
}
