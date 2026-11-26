import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPayment, createUploadedFile } from "@turftap/contract/client";
import { getBookingQueryKey } from "@turftap/contract/client/react-query";
import { toastError } from "@turftap/ui";

/** The page shows an expired booking itself once it reloads. */
const TIME_LIMIT_PASSED = "tt_pay_009";

/** PAY-02: uploads the Transfer Receipt, then sends it as the payment for the booking. */
export function useSendReceipt(bookingId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const { data: uploaded } = await createUploadedFile({ body: { file, purpose: "RECEIPT" } });
      const { data: payment } = await createPayment({
        body: { kind: "TRANSFER", bookingId, fileId: uploaded.data.id },
      });
      return payment.data;
    },
    meta: { silent: true },
    onError: (error) => {
      if (error.code !== TIME_LIMIT_PASSED) toastError(error);
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: getBookingQueryKey({ path: { id: bookingId } }) }),
  });
}
