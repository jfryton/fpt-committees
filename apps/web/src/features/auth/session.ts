import { queryOptions } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const sessionQueryOptions = queryOptions({
  queryKey: ["session"],
  queryFn: () => api.getSession()
});
