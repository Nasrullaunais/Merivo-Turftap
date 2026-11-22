import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

import { installApiTransport } from "../lib/api/transport";

installApiTransport();

afterEach(() => {
  cleanup();
  sessionStorage.clear();
});
