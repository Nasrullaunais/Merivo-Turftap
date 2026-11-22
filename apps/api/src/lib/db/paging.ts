import type { Page } from "@turftap/contract";
import { asc, desc, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

export type PageRequest<Field extends string = string> = {
  page: number;
  size: number;
  sort: { field: Field; direction: "asc" | "desc" };
};

/**
 * The ORDER BY for a page. `id` breaks ties so rows never swap places between pages.
 * Sort text by `sql\`lower(column)\`` so "alpha" and "Bravo" sort the way people expect.
 */
export function sortBy<Field extends string>(
  request: PageRequest<Field>,
  columns: Record<Field, AnyPgColumn | SQL>,
  id: AnyPgColumn,
): SQL[] {
  const order = request.sort.direction === "asc" ? asc : desc;
  return [order(columns[request.sort.field]), order(id)];
}

export async function pageOf<T>(
  request: PageRequest,
  rows: Promise<T[]>,
  total: Promise<number>,
): Promise<Page<T>> {
  const [content, totalElements] = await Promise.all([rows, total]);
  return {
    content,
    page: request.page,
    size: request.size,
    totalElements,
    totalPages: Math.ceil(totalElements / request.size),
  };
}
