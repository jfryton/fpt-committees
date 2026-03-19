import { createRoute, Link, useNavigate } from "@tanstack/react-router";
import { useDeferredValue, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { authenticatedRoute } from "@/routes/authenticated";
import { committeesQueryOptions } from "@/features/committees/queries";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n";

export const directoryRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/directory",
  component: DirectoryPage
});

function DirectoryPage() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const { data: committees, isLoading } = useQuery(committeesQueryOptions);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  const filtered =
    committees?.filter((committee) => {
      if (!deferredSearch) {
        return true;
      }
      const bag = [
        committee.committeeCode,
        committee.nameEn,
        committee.nameFr,
        committee.federalCochair,
        committee.ptCochair,
        committee.secretariatEmail
      ]
        .join(" ")
        .toLowerCase();
      return bag.includes(deferredSearch);
    }) ?? [];

  return (
    <div className="stack">
      <Card>
        <h1 className="title">{t.directoryTitle}</h1>
        <p className="subtitle">{t.directorySubtitle}</p>
      </Card>

      <Card>
        <label className="field">
          <span className="field-label">{t.searchPlaceholder}</span>
          <div className="row">
            <Search size={16} className="muted" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.currentTarget.value)}
              placeholder={t.searchPlaceholder}
            />
          </div>
        </label>
      </Card>

      {isLoading ? (
        <Card>{t.loading}</Card>
      ) : null}

      {!isLoading && filtered.length === 0 ? (
        <Card>{t.noCommittees}</Card>
      ) : null}

      <div className="grid grid-2">
        {filtered.map((committee) => (
          <Card key={committee.id}>
            <div className="row space-between">
              <strong>{committee.committeeCode}</strong>
              <span className="badge">{new Date(committee.updatedAt).toLocaleDateString()}</span>
            </div>
            <h3 style={{ marginBottom: "0.2rem" }}>
              {locale === "en" ? committee.nameEn : committee.nameFr}
            </h3>
            <p className="subtitle" style={{ marginTop: 0 }}>
              {committee.federalCochair} / {committee.ptCochair}
            </p>
            <p className="muted">{committee.secretariatEmail}</p>
            <div className="row">
              <Button
                variant="primary"
                onClick={() =>
                  void navigate({
                    to: "/app/committee/$committeeId",
                    params: { committeeId: committee.id }
                  })
                }
              >
                {t.open}
              </Button>
              <Link to="/app/committee/$committeeId" params={{ committeeId: committee.id }}>
                {t.details}
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
