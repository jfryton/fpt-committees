import { createRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { rootRoute } from "@/routes/root";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";

type LandingSearch = {
  token?: string;
};

export const landingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  validateSearch: (search: Record<string, unknown>): LandingSearch => ({
    token: typeof search.token === "string" ? search.token : undefined
  }),
  component: LandingPage
});

function LandingPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { token } = useSearch({ from: "/" });

  const exchangeMutation = useMutation({
    mutationFn: (tokenValue: string) => api.exchangeToken(tokenValue),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["session"] });
      window.history.replaceState({}, "", `${window.location.pathname}${window.location.hash.split("?")[0] ?? "#/"}`);
      void navigate({ to: "/app/directory" });
    }
  });

  useEffect(() => {
    if (token && !exchangeMutation.isPending && !exchangeMutation.isSuccess && !exchangeMutation.isError) {
      exchangeMutation.mutate(token);
    }
  }, [token, exchangeMutation]);

  return (
    <Card>
      <h1 className="title">{t.tokenLandingTitle}</h1>
      <p className="subtitle">{t.tokenLandingSubtitle}</p>
      <div className="stack" style={{ marginTop: "1rem" }}>
        {token ? <span className="badge">{t.loading}</span> : null}
        {exchangeMutation.isError ? (
          <div className="alert">{t.tokenError}</div>
        ) : null}
        <Button variant="primary" onClick={() => void navigate({ to: "/app/directory" })}>
          {t.goDirectory}
        </Button>
      </div>
    </Card>
  );
}
