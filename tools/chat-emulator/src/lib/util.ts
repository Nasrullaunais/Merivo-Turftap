export const nowStamp = (): string =>
  new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export const uid = (): string => crypto.randomUUID();
