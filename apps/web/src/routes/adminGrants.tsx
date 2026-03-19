import { createRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { authenticatedRoute } from "@/routes/authenticated";
import { grantsQueryOptions } from "@/features/grants/queries";
import { committeesQueryOptions } from "@/features/committees/queries";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useI18n } from "@/lib/i18n";
import type { GrantCreatePayload } from "@/lib/types";

export const adminGrantsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/admin/grants",
  component: AdminGrantsPage
});

const defaultForm: GrantCreatePayload = {
  displayName: "",
  role: "viewer",
  scopeMode: "all",
  committeeIds: [],
  expiresAt: null
};

function AdminGrantsPage() {
  const { t } = useI18n();
  const { data: grants, isLoading } = useQuery(grantsQueryOptions);
  const { data: session } = useQuery({ queryKey: ["session"], queryFn: api.getSession });
  const { data: committees } = useQuery(committeesQueryOptions);
  const [form, setForm] = useState<GrantCreatePayload>(defaultForm);
  const [selectedIdsRaw, setSelectedIdsRaw] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [createdLink, setCreatedLink] = useState<string | null>(null);

  if (session?.actor?.role !== "admin") {
    return (
      <Card>
        <h1 className="title">{t.adminTitle}</h1>
        <p className="subtitle">{t.adminOnly}</p>
      </Card>
    );
  }

  const createMutation = useMutation({
    mutationFn: () =>
      api.createGrant({
        ...form,
        committeeIds:
          form.scopeMode === "selected"
            ? selectedIdsRaw
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean)
            : []
      }),
    onSuccess: async (payload) => {
      await queryClient.invalidateQueries({ queryKey: ["grants"] });
      setForm(defaultForm);
      setSelectedIdsRaw("");
      setShowCreate(false);
      setCreatedLink(payload.accessLink);
    }
  });

  const revokeMutation = useMutation({
    mutationFn: (grantId: string) => api.revokeGrant(grantId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["grants"] });
    }
  });

  return (
    <div className="stack">
      <Card>
        <h1 className="title">{t.adminTitle}</h1>
        <p className="subtitle">{t.adminSubtitle}</p>
        <div className="row" style={{ marginTop: "0.7rem" }}>
          <Button variant="primary" onClick={() => setShowCreate((current) => !current)}>
            {showCreate ? t.close : t.createGrant}
          </Button>
        </div>
      </Card>

      {showCreate ? (
        <Card>
          <div className="grid grid-2">
            <LabeledField label={t.displayName}>
              <Input
                value={form.displayName}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, displayName: event.currentTarget.value }))
                }
              />
            </LabeledField>
          </div>
          <div className="grid grid-2" style={{ marginTop: "0.8rem" }}>
            <LabeledField label={t.accessRole}>
              <select
                className="select"
                value={form.role}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    role: event.currentTarget.value as GrantCreatePayload["role"]
                  }))
                }
              >
                <option value="viewer">{t.viewer}</option>
                <option value="editor">{t.editor}</option>
                <option value="admin">{t.admin}</option>
              </select>
            </LabeledField>
            <LabeledField label={t.scope}>
              <select
                className="select"
                value={form.scopeMode}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    scopeMode: event.currentTarget.value as GrantCreatePayload["scopeMode"]
                  }))
                }
              >
                <option value="all">{t.allCommittees}</option>
                <option value="selected">{t.selectedCommittees}</option>
              </select>
            </LabeledField>
          </div>
          {form.scopeMode === "selected" ? (
            <div style={{ marginTop: "0.8rem" }}>
              <LabeledField label={t.committeIds}>
                <Input
                  value={selectedIdsRaw}
                  onChange={(event) => setSelectedIdsRaw(event.currentTarget.value)}
                  placeholder={(committees ?? []).slice(0, 3).map((item) => item.id).join(", ")}
                />
              </LabeledField>
            </div>
          ) : null}
          <div className="row" style={{ marginTop: "1rem" }}>
            <Button
              variant="primary"
              disabled={createMutation.isPending || !form.displayName}
              onClick={() => createMutation.mutate()}
            >
              {t.create}
            </Button>
          </div>
        </Card>
      ) : null}

      {createdLink ? (
        <Card>
          <h2 className="title" style={{ fontSize: "1.1rem" }}>
            {t.latestAccessLink}
          </h2>
          <p className="subtitle">{t.latestAccessLinkBody}</p>
          <Input value={createdLink} readOnly />
        </Card>
      ) : null}

      <Card>
        {isLoading ? (
          <p>{t.loading}</p>
        ) : (
          <div className="stack">
            {(grants ?? []).map((grant) => (
              <article key={grant.id} className="card">
                <div className="row space-between">
                  <strong>{grant.displayName}</strong>
                  <span className="badge">
                    {grant.status === "active" ? t.active : t.revoked}
                  </span>
                </div>
                <p className="subtitle">{grant.role}</p>
                <p className="muted">
                  {t.expiresAt}:{" "}
                  {grant.expiresAt ? new Date(grant.expiresAt).toLocaleDateString() : t.never}
                </p>
                {grant.status === "active" ? (
                  <Button
                    variant="danger"
                    onClick={() => revokeMutation.mutate(grant.id)}
                    disabled={revokeMutation.isPending}
                  >
                    {t.revoke}
                  </Button>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function LabeledField({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}
