import type { AccessGrant, CommitteeRecord, CreatedGrantPayload } from "@fpt-committees/shared";
import { get, set, del } from "idb-keyval";
import type {
  AuthExchangePayload,
  BootstrapStatusPayload,
  CommitteeUpsertPayload,
  GrantCreatePayload,
  SessionPayload
} from "@/lib/types";

const API_BASE = import.meta.env.VITE_API_BASE_URL?.trim() || "/api";
const SESSION_TOKEN_KEY = "fpt.session-token";

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers ?? {});
  const sessionToken = await get<string>(SESSION_TOKEN_KEY);
  if (sessionToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${sessionToken}`);
  }
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers,
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
  getBootstrapStatus: () => request<BootstrapStatusPayload>("/auth/bootstrap"),
  bootstrap: () =>
    request<AuthExchangePayload>("/auth/bootstrap", {
      method: "POST"
    }),
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

export const sessionTokenStore = {
  set: (token: string) => set(SESSION_TOKEN_KEY, token),
  clear: () => del(SESSION_TOKEN_KEY)
};

export { ApiError };
