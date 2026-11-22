import type { FileInfo } from "archunit";
import { describe, expect, it } from "vitest";

declare module "vitest" {
  interface Matchers<R, T> {
    toPassAsync(options?: { allowEmptyTests?: boolean }): Promise<R | T | void>;
  }
}

// archunit adds toPassAsync to the global expect when it loads; the suite runs without globals.
Object.assign(globalThis, { expect });
const { projectFiles } = await import("archunit");

const prod = (extra: { inPath?: string[] } = {}) => ({
  except: {
    inFolder: ["src/test/**"],
    inPath: ["src/routeTree.gen.ts", ...(extra.inPath ?? [])],
    withName: ["*.test.ts", "*.test.tsx"],
  },
});
const files = () => projectFiles("tsconfig.json");
const optional = { allowEmptyTests: true };

const importsOf = (content: string) =>
  [...content.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*)["']([^"']+)["']/g)].map((m) => m[1]!);
const notImporting = (pkg: RegExp) => (file: FileInfo) =>
  !importsOf(file.content).some((spec) => pkg.test(spec));

const features = [
  ...new Set(Object.keys(import.meta.glob("./features/*/*")).map((path) => path.split("/")[2]!)),
];

describe("architecture (docs/architecture/frontend.md)", { timeout: 60_000 }, () => {
  it.each(["src/features/**", "src/layout/**", "src/routes/**", "src/components/**"])(
    "lib does not import %s",
    async (target) => {
      await expect(
        files().inFolder("src/lib/**", prod()).shouldNot().dependOnFiles().inFolder(target),
      ).toPassAsync(optional);
    },
  );

  it("components do not import features", async () => {
    await expect(
      files()
        .inFolder("src/components/**", prod())
        .shouldNot()
        .dependOnFiles()
        .inFolder("src/features/**"),
    ).toPassAsync(optional);
  });

  it.each(features)("feature %s does not import other features", async (feature) => {
    await expect(
      files()
        .inFolder(`src/features/${feature}/**`, prod())
        .shouldNot()
        .dependOnFiles()
        .inFolder("src/features/**", { except: { inFolder: `src/features/${feature}/**` } }),
    ).toPassAsync(optional);
  });

  it("has no circular imports", async () => {
    await expect(files().inPath("src/**", prod()).should().haveNoCycles()).toPassAsync();
  });

  it("app code never imports test helpers", async () => {
    await expect(
      files().inPath("src/**", prod()).shouldNot().dependOnFiles().inFolder("src/test/**"),
    ).toPassAsync();
  });

  it.each([
    ["oidc-client-ts", /^oidc-client-ts(\/|$)/, "src/lib/auth/**"],
    ["the API client instance", /^@turftap\/contract\/client\/client$/, "src/lib/api/**"],
  ])("only its wrapper imports %s", async (name, pkg, wrapper) => {
    await expect(
      files()
        .inPath("src/**", { except: { inFolder: [wrapper, "src/test/**"] } })
        .should()
        .adhereTo(notImporting(pkg), `${name} is used through ${wrapper}`),
    ).toPassAsync();
  });

  it("never imports the other React app", async () => {
    await expect(
      files()
        .inPath("src/**")
        .should()
        .adhereTo(
          notImporting(/apps\/|@turftap\/(portal|console)/),
          "share code through packages/",
        ),
    ).toPassAsync();
  });

  it("hooks live in use*.ts files and components export no hooks", async () => {
    await expect(
      files()
        .withName(/^use[A-Z]\w*\.tsx?$/)
        .should()
        .haveName(/^use[A-Z]\w*\.ts$/),
    ).toPassAsync(optional);
    await expect(
      files()
        .withName("*.tsx", prod())
        .should()
        .adhereTo(
          (file) => !/\bexport\s+(?:function|const|let)\s+use[A-Z]/.test(file.content),
          "export hooks from a use*.ts file so hot reload keeps component state",
        ),
    ).toPassAsync();
  });

  it("contexts live in *-context.ts files", async () => {
    await expect(
      files()
        .inPath("src/**", prod())
        .should()
        .adhereTo(
          (file) =>
            /-context\.ts$/.test(file.path) ||
            !/\bexport\s+const\s+\w+\s*=\s*createContext\b/.test(file.content),
          "exported contexts belong in a *-context.ts file",
        ),
    ).toPassAsync();
  });
});
