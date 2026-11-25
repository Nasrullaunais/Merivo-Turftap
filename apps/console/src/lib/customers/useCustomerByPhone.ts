import { useQuery } from "@tanstack/react-query";
import { PhoneInput } from "@turftap/contract";
import { listCustomersOptions } from "@turftap/contract/client/react-query";

/** The customer with this phone number, once it is a whole number. */
export function useCustomerByPhone(phone: string) {
  const parsed = PhoneInput.safeParse(phone);
  return useQuery({
    ...listCustomersOptions({ query: { phone: parsed.data ?? "" } }),
    enabled: parsed.success,
    select: (reply) => reply.data.content[0],
  });
}
