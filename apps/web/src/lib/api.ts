import type { AccessGrant, CommitteeRecord, CreatedGrantPayload } from "@fpt-committees/shared";
import type {
  AuthExchangePayload,
  CommitteeUpsertPayload,
  GrantCreatePayload,
  SessionPayload
} from "@/lib/types";

const API_BASE = import.meta.env.VITE_API_BASE_URL?.trim() || "/api";

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    ...init
  });

  if (!response.ok) {
    let message = response.statusText;
    try {
      const body = (await response.json()) as { message?: string };
      if (body.message) {
        message = body.message;
      }
    } catch {
      // ignore JSON parse errors, fallback to status text.
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const api = {
  getSession: () => request<SessionPayload>("/auth/session"),
  exchangeToken: (token: string) =>
    request<AuthExchangePayload>("/auth/exchange", {
      method: "POST",
      body: JSON.stringify({ token })
    }),
  logout: () =>
    request<void>("/auth/logout", {
      method: "POST"
    }),
  listCommittees: () => request<CommitteeRecord[]>("/committees"),
  getCommittee: (committeeId: string) =>
    request<CommitteeRecord>(`/committees/${committeeId}`),
  updateCommittee: (committeeId: string, payload: CommitteeUpsertPayload) =>
    request<CommitteeRecord>(`/committees/${committeeId}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    }),
  listGrants: () => request<AccessGrant[]>("/grants"),
  createGrant: (payload: GrantCreatePayload) =>
    request<CreatedGrantPayload>("/grants", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  revokeGrant: (grantId: string) =>
    request<AccessGrant>(`/grants/${grantId}/revoke`, {
      method: "POST"
    })
};

export { ApiError };
