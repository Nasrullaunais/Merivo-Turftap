import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createBookingMutation } from "@turftap/contract/client/react-query";
import { ApiError, toastError } from "@turftap/ui";

/** Someone else booked the time first, or it can't be booked any more (it started, say). */
const SLOT_GONE = new Set(["tt_bkg_002", "tt_bkg_004"]);
const ALREADY_WAITING = "tt_bkg_003";

const codeOf = (error: unknown) => (error instanceof ApiError ? (error.code ?? "") : "");
export const isSlotGone = (error: unknown) => SLOT_GONE.has(codeOf(error));
export const isAlreadyWaiting = (error: unknown) => codeOf(error) === ALREADY_WAITING;

/** BKG-02: makes the booking. The two refusals a customer can act on are shown by the page. */
export function useBook() {
  const queryClient = useQueryClient();
  return useMutation({
    ...createBookingMutation(),
    meta: { silent: true },
    onError: (error) => {
      // The time list must ask again, or it would still show the lost time as free.
      if (isSlotGone(error))
        void queryClient.invalidateQueries({ queryKey: [{ _id: "listAvailability" }] });
      else if (!isAlreadyWaiting(error)) toastError(error);
    },
  });
}
