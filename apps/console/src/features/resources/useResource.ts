import { useQuery } from "@tanstack/react-query";
import { getResourceOptions } from "@turftap/contract/client/react-query";

export function useResource(id: number) {
  return useQuery({ ...getResourceOptions({ path: { id } }), select: (reply) => reply.data });
}
