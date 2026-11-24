import type { Page } from "@turftap/contract";
import type { Hono } from "hono";
import type { z } from "zod";

import type { AuthContext, Caller } from "../auth/context";
import type { PageRequest } from "../db/paging";
import type { AppEnv } from "../http/env";

export type Operation = "list" | "get" | "create" | "update" | "delete";

export type SortValue<Field extends string> = `${Field},${"asc" | "desc"}`;

export type ListQuery<Filters, SortField extends string> = {
  filters: Filters;
  page: PageRequest<SortField>;
};

export type Handlers<Item, Create, Update, Filters, SortField extends string> = {
  list: (auth: AuthContext, query: ListQuery<Filters, SortField>) => Promise<Page<Item>>;
  get: (auth: AuthContext, id: number) => Promise<Item>;
  create: (auth: AuthContext, input: Create) => Promise<Item>;
  update: (auth: AuthContext, id: number, input: Update) => Promise<Item>;
  remove: (auth: AuthContext, id: number) => Promise<void>;
};

/** `delete` is a reserved word, so the service function is called `remove`. */
type HandlerName<Op extends Operation> = Op extends "delete" ? "remove" : Op;

export type ResourceDefinition<
  Op extends Operation,
  Item extends z.ZodType,
  Create extends z.ZodType,
  Update extends z.ZodType,
  Filters extends z.ZodObject,
  SortField extends string,
> = {
  /** Plural, kebab-case: the URL is /v1/<name> and permissions are <name>:<action>. */
  name: string;
  operations: readonly Op[];
  /** Operations open without sign-in. They still need a tenant (X-Tenant-Slug). */
  public?: readonly NoInfer<Op>[];
  /** Operations customers and the Assistant may call; the service limits them to their own rows. */
  forCustomers?: readonly NoInfer<Op>[];
  /**
   * Operations only the Assistant may call, before it knows the tenant (finding a chat's tenant).
   * Their service functions take a `Caller` with no tenant.
   */
  forAssistantWithoutTenant?: readonly NoInfer<Op>[];
  schemas: { item: Item; create?: Create; update?: Update; filters?: Filters };
  /** Create takes a multipart form carrying one file of at most `maxBytes`, instead of JSON. */
  upload?: { maxBytes: number };
  sort?: { fields: readonly SortField[]; default: SortValue<NoInfer<SortField>> };
  service: Pick<
    Handlers<z.output<Item>, z.output<Create>, z.output<Update>, z.output<Filters>, SortField>,
    HandlerName<Op>
  >;
};

export type SingletonDefinition<Item extends z.ZodType> = {
  name: string;
  schemas: { item: Item };
  service: { get: (caller: Caller) => Promise<z.output<Item>> };
};

export type Resource = {
  name: string;
  routes: Hono<AppEnv>;
  openapi: () => Record<string, unknown>;
};

export type AnyDefinition = ResourceDefinition<
  Operation,
  z.ZodType,
  z.ZodType,
  z.ZodType,
  z.ZodObject,
  string
>;

export type StreamDefinition<Item extends z.ZodType> = {
  name: string;
  schemas: { item: Item };
  /** Calls `send` for each item the caller may see, until the returned function is called. */
  service: {
    subscribe: (auth: AuthContext, send: (item: z.output<Item>) => void) => () => void;
  };
};
