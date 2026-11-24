import "@testing-library/jest-dom/vitest";

import { cleanup, configure } from "@testing-library/react";
import { afterEach, vi } from "vitest";

import { installApiTransport } from "../lib/api/transport";

installApiTransport();

// The first page a test file renders takes over a second on CI runners; the 1-second default flaked.
const FIND_TIMEOUT_MS = 5000;
configure({ asyncUtilTimeout: FIND_TIMEOUT_MS });

window.scrollTo = () => {}; // jsdom has no scrolling; the router calls it on every page change.
// jsdom has no ResizeObserver; HeroUI's form controls create one to measure themselves.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// jsdom's Request rejects relative URLs; browsers resolve them against the page.
const NodeRequest = globalThis.Request;
globalThis.Request = class extends NodeRequest {
  constructor(input: RequestInfo | URL, init?: RequestInit) {
    super(typeof input === "string" ? new URL(input, window.location.origin) : input, init);
  }
};

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  localStorage.clear();
  vi.unstubAllGlobals();
});
