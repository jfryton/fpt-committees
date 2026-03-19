import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { Building2, Shield, SquarePen } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { startTransition } from "react";
import { api, sessionTokenStore } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { sessionQueryOptions } from "@/features/auth/session";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/Button";

export function AppShell() {
  const { t, locale, setLocale } = useI18n();
  const navigate = useNavigate();
  const pathname = useRouterState({
    select: (state) => state.location.pathname
  });

  const { data: session } = useQuery(sessionQueryOptions);

  const logoutMutation = useMutation({
    mutationFn: () => api.logout(),
    onSuccess: async () => {
      await sessionTokenStore.clear();
      await queryClient.invalidateQueries({ queryKey: ["session"] });
      startTransition(() => {
        void navigate({ to: "/" });
      });
    }
  });

  return (
    <div className="app-shell">
      <header className="topbar row space-between">
        <div>
          <strong>{t.appName}</strong>
          {session?.actor ? (
            <span className="badge" style={{ marginLeft: "0.5rem" }}>
              {session.actor.displayName}
            </span>
          ) : null}
        </div>
        <div className="row">
          <Button
            onClick={() => setLocale(locale === "en" ? "fr" : "en")}
            variant="secondary"
          >
            {t.language}: {locale.toUpperCase()}
          </Button>
          {session?.authenticated ? (
            <Button
              variant="secondary"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
            >
              {t.signOut}
            </Button>
          ) : null}
        </div>
      </header>

      <main className="stack">
        <Outlet />
      </main>

      {session?.authenticated ? (
        <nav className="bottom-nav">
          <Link className="nav-link" to="/app/directory" data-active={pathname.startsWith("/app/directory")}>
            <Building2 size={16} />
            {t.directoryNav}
          </Link>
          <Link className="nav-link" to="/app/committee/$committeeId" params={{ committeeId: "com_health" }} data-active={pathname.startsWith("/app/committee")}>
            <SquarePen size={16} />
            {t.committeeNav}
          </Link>
          {session?.actor?.role === "admin" ? (
            <Link className="nav-link" to="/app/admin/grants" data-active={pathname.startsWith("/app/admin")}>
              <Shield size={16} />
              {t.adminNav}
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
