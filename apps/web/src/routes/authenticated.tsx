import { createRoute, redirect } from "@tanstack/react-router";
import { rootRoute } from "@/routes/root";
import { queryClient } from "@/lib/queryClient";
import { sessionQueryOptions } from "@/features/auth/session";

export const authenticatedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "authenticated",
  path: "/app",
  beforeLoad: async () => {
    const session = await queryClient.ensureQueryData(sessionQueryOptions);
    if (!session.authenticated) {
      throw redirect({ to: "/" });
    }
    return { actor: session.actor };
  }
});
