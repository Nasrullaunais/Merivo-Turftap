import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPayment, createUploadedFile } from "@turftap/contract/client";
import { getBookingQueryKey, getMembershipQueryKey } from "@turftap/contract/client/react-query";
import { toastError } from "@turftap/ui";

/** The page shows an expired booking or membership itself once it reloads. */
const TIME_LIMIT_PASSED = "tt_pay_009";

/** What a Transfer Receipt pays for: one booking or one membership. */
export type PaysFor = { bookingId: number } | { membershipId: number };

const queryKeyOf = (paysFor: PaysFor) =>
  "bookingId" in paysFor
    ? getBookingQueryKey({ path: { id: paysFor.bookingId } })
    : getMembershipQueryKey({ path: { id: paysFor.membershipId } });

/** PAY-02: uploads the Transfer Receipt, then sends it as the payment for what it pays for. */
export function useSendReceipt(paysFor: PaysFor) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const { data: uploaded } = await createUploadedFile({ body: { file, purpose: "RECEIPT" } });
      const { data: payment } = await createPayment({
        body: { kind: "TRANSFER", ...paysFor, fileId: uploaded.data.id },
      });
      return payment.data;
    },
    meta: { silent: true },
    onError: (error) => {
      if (error.code !== TIME_LIMIT_PASSED) toastError(error);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeyOf(paysFor) }),
  });
}
