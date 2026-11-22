import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

import type { FileInfo } from "archunit";

declare module "bun:test" {
  interface Matchers<T> {
    toPassAsync(options?: { allowEmptyTests?: boolean }): Promise<T>;
  }
}

// archunit adds toPassAsync to the global expect when it loads.
Object.assign(globalThis, { expect });
const { projectFiles } = await import("archunit");

const SRC = import.meta.dir;
const TEST_FILES = ["*.test.ts", "*.contract-test.ts"];
const prod = { except: { withName: TEST_FILES, inFolder: ["src/test/**"] } };
const files = () => projectFiles("tsconfig.json");

const MODULES = readdirSync(join(SRC, "modules"));

const withoutComments = (text: string) => text.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");

/** Every production .ts file under src/: its path relative to src/ and its code without comments. */
const sourceFiles = (function walk(dir: string): { path: string; text: string }[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "test" ? [] : walk(full);
    if (!entry.name.endsWith(".ts") || /\.(test|contract-test)\.ts$/.test(entry.name)) return [];
    return [{ path: relative(SRC, full), text: withoutComments(readFileSync(full, "utf8")) }];
  });
})(SRC);

const importsOf = (text: string) =>
  [...text.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*)["']([^"']+)["']/g)].map((match) => match[1]!);

const notImporting = (pkg: RegExp) => (file: FileInfo) =>
  !importsOf(file.content).some((s) => pkg.test(s));

const failures = (check: (file: { path: string; text: string }) => string | undefined) =>
  sourceFiles.map(check).filter(Boolean);

describe("architecture (docs/architecture/testing.md)", () => {
  it("1. lib imports nothing from modules, adapters, hooks or the app wiring", async () => {
    for (const target of ["src/modules/**", "src/adapters/**", "src/hooks/**"]) {
      await expect(
        files().inFolder("src/lib/**", prod).shouldNot().dependOnFiles().inFolder(target),
      ).toPassAsync();
    }
    for (const target of ["src/app.ts", "src/wiring.ts", "src/resources.ts", "src/main.ts"]) {
      await expect(
        files().inFolder("src/lib/**", prod).shouldNot().dependOnFiles().inPath(target),
      ).toPassAsync();
    }
  });

  it.each(MODULES)("2. module %s uses other modules only through their service", (module) => {
    const problems = failures(({ path, text }) => {
      if (!path.startsWith(`modules/${module}/`)) return undefined;
      const bad = importsOf(text).filter((spec) => {
        const other = spec.match(/^\.\.\/([^/]+)\/([^/]+)$/);
        if (!other || other[1] === module || !MODULES.includes(other[1]!)) return false;
        const allowed =
          other[2]!.endsWith(".service") ||
          (path.endsWith(".tables.ts") && other[2]!.endsWith(".tables"));
        return !allowed;
      });
      return bad.length ? `${path} imports ${bad.join(", ")}` : undefined;
    });
    expect(problems).toEqual([]);
  });

  it("3. routes never import a repository", async () => {
    await expect(
      files().withName("*.routes.ts").shouldNot().dependOnFiles().withName("*.repository.ts"),
    ).toPassAsync();
  });

  it("4. repositories never import services, routes or ports", async () => {
    for (const target of ["*.service.ts", "*.routes.ts"]) {
      await expect(
        files().withName("*.repository.ts").shouldNot().dependOnFiles().withName(target),
      ).toPassAsync();
    }
    await expect(
      files().withName("*.repository.ts").shouldNot().dependOnFiles().inFolder("src/ports/**"),
    ).toPassAsync();
  });

  it.each([
    ["@aws-sdk", /^@aws-sdk\//, "src/adapters/object-storage/s3/**"],
    ["jose", /^jose$/, "src/adapters/auth-provider/auth0/**"],
    ["@google/genai", /^@google\/genai/, "src/adapters/receipt-reader/gemini/**"],
  ])("5. only its adapter imports %s", async (_name, pkg, adapter) => {
    await expect(
      files()
        .inPath("src/**", { except: { inFolder: [adapter] } })
        .should()
        .adhereTo(notImporting(pkg), `only ${adapter} may import this vendor library`),
    ).toPassAsync();
  });

  it("6. only wiring.ts and tests import adapters", async () => {
    await expect(
      files()
        .inPath("src/**", {
          except: {
            inFolder: ["src/adapters/**", "src/test/**"],
            inPath: ["src/wiring.ts"],
            withName: TEST_FILES,
          },
        })
        .shouldNot()
        .dependOnFiles()
        .inFolder("src/adapters/**"),
    ).toPassAsync();
  });

  it("7. hooks import only services, ports and lib", () => {
    const problems = failures(({ path, text }) => {
      if (!path.startsWith("hooks/")) return undefined;
      const bad = importsOf(text).filter(
        (spec) => spec.includes("/modules/") && !spec.endsWith(".service"),
      );
      return bad.length ? `${path} imports ${bad.join(", ")}` : undefined;
    });
    expect(problems).toEqual([]);
  });

  it("8. every repository function takes tenantId first (platform and *AcrossTenants excepted)", () => {
    const problems = failures(({ path, text }) => {
      if (!path.endsWith(".repository.ts") || path.startsWith("modules/platform/"))
        return undefined;
      const exported = [
        ...text.matchAll(/export\s+(?:async\s+)?function\s+(\w+)\s*(?:<[^>]*>)?\(\s*([^,)]*)/g),
        ...text.matchAll(/export\s+const\s+(\w+)\s*=\s*(?:async\s*)?\(\s*([^,)]*)/g),
      ];
      const bad = exported
        .filter((match) => !/^tenantId\s*:/.test(match[2]!) && !match[1]!.endsWith("AcrossTenants"))
        .map((match) => match[1]);
      return bad.length ? `${path}: ${bad.join(", ")}` : undefined;
    });
    expect(problems).toEqual([]);
  });

  it("9. transactions are opened only in services", () => {
    const problems = failures(({ path, text }) => {
      if (path.startsWith("lib/db/") || path.endsWith(".service.ts")) return undefined;
      return /\btransaction\(|\.transaction\(/.test(text) ? path : undefined;
    });
    expect(problems).toEqual([]);
  });

  it("10. has no circular imports", async () => {
    await expect(files().inFolder("src/**", prod).should().haveNoCycles()).toPassAsync();
  });

  it("11. only lib, hooks and app.ts use Hono, so modules cannot add routes", () => {
    const problems = failures(({ path, text }) => {
      if (path.startsWith("lib/") || path.startsWith("hooks/") || path === "app.ts")
        return undefined;
      return importsOf(text).some((spec) => /^hono(\/|$)/.test(spec)) ? path : undefined;
    });
    expect(problems).toEqual([]);
  });

  it("12. modules never catch errors; they throw and let the central handler reply", () => {
    const problems = failures(({ path, text }) =>
      path.startsWith("modules/") && /\btry\s*\{|\.catch\(/.test(text) ? path : undefined,
    );
    expect(problems).toEqual([]);
  });
});

describe("error codes", () => {
  const AREAS: Record<string, string> = {
    platform: "plt",
    staff: "stf",
    venues: "ven",
    customers: "cus",
    bookings: "bkg",
    payments: "pay",
    memberships: "mem",
    notifications: "ntf",
    files: "fil",
  };
  const codes = sourceFiles.flatMap(({ path, text }) =>
    [...text.matchAll(/["'](tt_[a-z0-9_]+)["']/g)].map((match) => ({ path, code: match[1]! })),
  );

  it("follow tt_<area>_<nnn>", () => {
    expect(codes.filter(({ code }) => !/^tt_[a-z]{3}_\d{3}$/.test(code))).toEqual([]);
  });

  it("use their module's area and live in its errors file", () => {
    const misplaced = codes.filter(({ path, code }) => {
      const module = path.match(/^modules\/([^/]+)\//)?.[1];
      if (!module) return false;
      return !path.endsWith(".errors.ts") || code.split("_")[1] !== AREAS[module];
    });
    expect(misplaced).toEqual([]);
  });

  it("are never reused by two module errors", () => {
    const moduleCodes = codes
      .filter(({ path }) => path.startsWith("modules/"))
      .map(({ code }) => code);
    expect(moduleCodes.filter((code, index) => moduleCodes.indexOf(code) !== index)).toEqual([]);
  });
});
