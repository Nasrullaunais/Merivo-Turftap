/** Back-to-back slots a customer has picked: the first one's start and how many. */
export type Selection = { startsAt: string; count: number };

export const endOf = (choice: Selection, slotMs: number) =>
  new Date(Date.parse(choice.startsAt) + choice.count * slotMs).toISOString();

/** Whether the start time `startsAt` falls inside the chosen booking. */
export function covers(choice: Selection | undefined, startsAt: string, slotMs: number) {
  if (!choice) return false;
  const at = Date.parse(startsAt);
  return at >= Date.parse(choice.startsAt) && at < Date.parse(endOf(choice, slotMs));
}
