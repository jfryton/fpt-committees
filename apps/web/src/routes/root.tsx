import { createRootRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";

export const rootRoute = createRootRoute({
  component: AppShell,
  notFoundComponent: () => (
    <section className="card">
      <h1 className="title">Not Found</h1>
      <p className="subtitle">The page does not exist.</p>
    </section>
  )
});
