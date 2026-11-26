import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { render } from "@testing-library/react";
import { createQueryClient } from "@turftap/ui";

import { createAppRouter } from "../router";

/** The whole portal, opened at `path`, as a customer's browser would. */
export function renderPortal(path = "/") {
  window.history.replaceState(null, "", path);
  const queryClient = createQueryClient();
  const router = createAppRouter();
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} context={{ queryClient }} />
    </QueryClientProvider>,
  );
  return router;
}

/** One page of a list reply. */
export const page = <T,>(content: T[]) => ({
  content,
  page: 0,
  size: 20,
  totalElements: content.length,
  totalPages: 1,
});
