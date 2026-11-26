import { useQuery } from "@tanstack/react-query";
import { getMeOptions } from "@turftap/contract/client/react-query";

/** The signed-in person: the phone their customer record is kept under, and a name if one is known. */
export function useMe({ enabled }: { enabled: boolean }) {
  return useQuery({ ...getMeOptions(), select: (reply) => reply.data, enabled });
}
