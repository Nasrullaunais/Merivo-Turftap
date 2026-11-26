import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

import { installApiTransport } from "../lib/api/transport";

installApiTransport();

// jsdom's Request rejects relative URLs; browsers resolve them against the page.
const NodeRequest = globalThis.Request;
globalThis.Request = class extends NodeRequest {
  constructor(input: RequestInfo | URL, init?: RequestInit) {
    super(typeof input === "string" ? new URL(input, window.location.origin) : input, init);
  }
};

// jsdom can't scroll; the router scrolls to the top after each page change.
window.scrollTo = () => {};

afterEach(() => cleanup());
