import { createHashHistory } from "@tanstack/history";
import { createRouter } from "@tanstack/react-router";
import { rootRoute } from "@/routes/root";
import { landingRoute } from "@/routes/landing";
import { authenticatedRoute } from "@/routes/authenticated";
import { directoryRoute } from "@/routes/directory";
import { committeeRoute } from "@/routes/committee";
import { adminGrantsRoute } from "@/routes/adminGrants";

const routeTree = rootRoute.addChildren([
  landingRoute,
  authenticatedRoute.addChildren([directoryRoute, committeeRoute, adminGrantsRoute])
]);

export const router = createRouter({
  routeTree,
  history: createHashHistory()
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
