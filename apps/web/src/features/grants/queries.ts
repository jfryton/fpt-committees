import { queryOptions } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const grantsQueryOptions = queryOptions({
  queryKey: ["grants"],
  queryFn: () => api.listGrants()
});
