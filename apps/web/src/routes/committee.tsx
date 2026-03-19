import { createRoute, useParams } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { authenticatedRoute } from "@/routes/authenticated";
import { committeeDetailQueryOptions } from "@/features/committees/queries";
import { Card } from "@/components/ui/Card";
import { Input, TextArea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useI18n } from "@/lib/i18n";
import type { CommitteeUpsertPayload } from "@/lib/types";
import { sessionQueryOptions } from "@/features/auth/session";

export const committeeRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/committee/$committeeId",
  component: CommitteePage
});

const defaultForm: CommitteeUpsertPayload = {
  committeeCode: "",
  nameEn: "",
  nameFr: "",
  federalCochair: "",
  ptCochair: "",
  mandateEn: "",
  mandateFr: "",
  meetingFrequencyEn: "",
  meetingFrequencyFr: "",
  secretariatEmail: ""
};

function CommitteePage() {
  const { t } = useI18n();
  const { committeeId } = useParams({
    from: "/authenticated/committee/$committeeId"
  });
  const [form, setForm] = useState<CommitteeUpsertPayload>(defaultForm);
  const [saved, setSaved] = useState(false);
  const { data: session } = useQuery(sessionQueryOptions);

  const detailQuery = useQuery({
    ...committeeDetailQueryOptions(committeeId),
    enabled: true
  });

  useEffect(() => {
    if (detailQuery.data) {
      const {
        committeeCode,
        nameEn,
        nameFr,
        federalCochair,
        ptCochair,
        mandateEn,
        mandateFr,
        meetingFrequencyEn,
        meetingFrequencyFr,
        secretariatEmail
      } = detailQuery.data;
      setForm({
        committeeCode,
        nameEn,
        nameFr,
        federalCochair,
        ptCochair,
        mandateEn,
        mandateFr,
        meetingFrequencyEn,
        meetingFrequencyFr,
        secretariatEmail
      });
    }
  }, [detailQuery.data]);

  const mutation = useMutation({
    mutationFn: () => api.updateCommittee(committeeId, form),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ["committees"] });
      queryClient.setQueryData(["committee", committeeId], updated);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    }
  });

  if (detailQuery.isLoading) {
    return <Card>{t.loading}</Card>;
  }

  const canEdit =
    session?.actor?.role === "admin" ||
    (session?.actor?.role === "editor" &&
      (session.actor.allowedCommitteeIds === null ||
        session.actor.allowedCommitteeIds.includes(committeeId)));

  return (
    <Card>
      <div className="row space-between">
        <h1 className="title">{t.details}</h1>
        {saved ? <span className="badge">{t.saved}</span> : null}
      </div>
      <div className="grid grid-2">
        <LabeledInput
          label="Code"
          value={form.committeeCode}
          onChange={(value) => setForm((prev) => ({ ...prev, committeeCode: value }))}
        />
        <LabeledInput
          label="Email"
          value={form.secretariatEmail}
          onChange={(value) => setForm((prev) => ({ ...prev, secretariatEmail: value }))}
        />
        <LabeledInput
          label="Name (EN)"
          value={form.nameEn}
          onChange={(value) => setForm((prev) => ({ ...prev, nameEn: value }))}
        />
        <LabeledInput
          label="Nom (FR)"
          value={form.nameFr}
          onChange={(value) => setForm((prev) => ({ ...prev, nameFr: value }))}
        />
        <LabeledInput
          label="Federal co-chair"
          value={form.federalCochair}
          onChange={(value) => setForm((prev) => ({ ...prev, federalCochair: value }))}
        />
        <LabeledInput
          label="PT co-chair"
          value={form.ptCochair}
          onChange={(value) => setForm((prev) => ({ ...prev, ptCochair: value }))}
        />
      </div>
      <div className="grid" style={{ marginTop: "0.7rem" }}>
        <LabeledTextArea
          label="Mandate (EN)"
          value={form.mandateEn}
          onChange={(value) => setForm((prev) => ({ ...prev, mandateEn: value }))}
        />
        <LabeledTextArea
          label="Mandat (FR)"
          value={form.mandateFr}
          onChange={(value) => setForm((prev) => ({ ...prev, mandateFr: value }))}
        />
      </div>
      <div className="grid grid-2" style={{ marginTop: "0.7rem" }}>
        <LabeledInput
          label="Meeting frequency (EN)"
          value={form.meetingFrequencyEn}
          onChange={(value) =>
            setForm((prev) => ({ ...prev, meetingFrequencyEn: value }))
          }
        />
        <LabeledInput
          label="Frequence des reunions (FR)"
          value={form.meetingFrequencyFr}
          onChange={(value) =>
            setForm((prev) => ({ ...prev, meetingFrequencyFr: value }))
          }
        />
      </div>
      <div style={{ marginTop: "1rem" }}>
        <Button
          variant="primary"
          disabled={mutation.isPending || !canEdit}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? t.saving : t.saveChanges}
        </Button>
      </div>
    </Card>
  );
}

function LabeledInput({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <Input value={value} onChange={(event) => onChange(event.currentTarget.value)} />
    </label>
  );
}

function LabeledTextArea({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <TextArea value={value} onChange={(event) => onChange(event.currentTarget.value)} />
    </label>
  );
}
