/** The shape another language's catalog must have: `export default { … } satisfies Catalog<typeof en>`. */
export type Catalog<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => string
    ? (...args: A) => string
    : T[K] extends string
      ? string
      : Catalog<T[K]>;
};
