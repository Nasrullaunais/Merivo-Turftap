import { useQuery } from "@tanstack/react-query";
import { listStaffOptions } from "@turftap/contract/client/react-query";

const LIST_SIZE = 100;

export function useStaff() {
  return useQuery({
    ...listStaffOptions({ query: { size: LIST_SIZE } }),
    select: (reply) => reply.data.content,
  });
}
