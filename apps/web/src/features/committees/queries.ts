import { queryOptions } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const committeesQueryOptions = queryOptions({
  queryKey: ["committees"],
  queryFn: () => api.listCommittees()
});

export const committeeDetailQueryOptions = (committeeId: string) =>
  queryOptions({
    queryKey: ["committee", committeeId],
    queryFn: () => api.getCommittee(committeeId),
    enabled: committeeId.length > 0
  });
