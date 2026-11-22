import "./styles/globals.css";

import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { createQueryClient } from "@turftap/ui";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { installApiTransport } from "./lib/api/transport";
import { createAppRouter } from "./router";

installApiTransport();
const queryClient = createQueryClient();
const router = createAppRouter();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} context={{ queryClient }} />
    </QueryClientProvider>
  </StrictMode>,
);
