import { z } from "zod";

const DEFAULT_PORT = 3000;
const DEFAULT_AUTH_CACHE_SECONDS = 300;

const commaList = z.string().transform((text) =>
  text
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean),
);

const Env = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(DEFAULT_PORT),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error", "silent"]).default("info"),
  DATABASE_URL: z.url(),
  CORS_ORIGINS: commaList.default(["http://localhost:5173", "http://localhost:5174"]),

  AUTH_PROVIDER: z.enum(["fake", "auth0"]).default("fake"),
  AUTH_CACHE_SECONDS: z.coerce.number().int().min(0).default(DEFAULT_AUTH_CACHE_SECONDS),
  AUTH0_DOMAIN: z.string().optional(),
  AUTH0_AUDIENCE: z.string().optional(),
  AUTH0_PHONE_CLAIM: z.string().default("phone_number"),

  STORAGE_PROVIDER: z.enum(["fake", "s3"]).default("fake"),
  S3_ENDPOINT: z.url().optional(),
  S3_REGION: z.string().default("us-east-1"),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),

  MESSAGING_PROVIDER: z.enum(["fake"]).default("fake"),
  RECEIPT_READER: z.enum(["fake"]).default("fake"),
});

type Env = z.output<typeof Env>;

function required<K extends keyof Env>(env: Env, keys: K[], reason: string) {
  const missing = keys.filter((key) => !env[key]);
  if (missing.length) throw new Error(`${missing.join(", ")} must be set when ${reason}`);
  return Object.fromEntries(keys.map((key) => [key, env[key]])) as {
    [P in K]: NonNullable<Env[P]>;
  };
}

export function loadConfig(source: Record<string, string | undefined> = process.env) {
  const parsed = Env.safeParse(source);
  if (!parsed.success) {
    const problems = parsed.error.issues.map(
      (issue) => `${issue.path.join(".")}: ${issue.message}`,
    );
    throw new Error(`Invalid settings:\n  ${problems.join("\n  ")}`);
  }
  const env = parsed.data;
  const providers = [
    env.AUTH_PROVIDER,
    env.STORAGE_PROVIDER,
    env.MESSAGING_PROVIDER,
    env.RECEIPT_READER,
  ];
  if (env.NODE_ENV === "production" && providers.includes("fake")) {
    throw new Error("Fake adapters are not allowed when NODE_ENV=production");
  }

  return {
    env: env.NODE_ENV,
    port: env.PORT,
    logLevel: env.LOG_LEVEL,
    databaseUrl: env.DATABASE_URL,
    corsOrigins: env.CORS_ORIGINS,
    auth: { cacheSeconds: env.AUTH_CACHE_SECONDS, provider: authProvider(env) },
    storage: storage(env),
    messaging: { kind: env.MESSAGING_PROVIDER },
    receiptReader: { kind: env.RECEIPT_READER },
  };
}

function authProvider(env: Env) {
  if (env.AUTH_PROVIDER === "fake") return { kind: "fake" as const };
  const auth0 = required(env, ["AUTH0_DOMAIN", "AUTH0_AUDIENCE"], "AUTH_PROVIDER=auth0");
  return {
    kind: "auth0" as const,
    domain: auth0.AUTH0_DOMAIN,
    audience: auth0.AUTH0_AUDIENCE,
    phoneClaim: env.AUTH0_PHONE_CLAIM,
  };
}

function storage(env: Env) {
  if (env.STORAGE_PROVIDER === "fake") return { kind: "fake" as const };
  const s3 = required(
    env,
    ["S3_ENDPOINT", "S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"],
    "STORAGE_PROVIDER=s3",
  );
  return {
    kind: "s3" as const,
    endpoint: s3.S3_ENDPOINT,
    region: env.S3_REGION,
    bucket: s3.S3_BUCKET,
    accessKeyId: s3.S3_ACCESS_KEY_ID,
    secretAccessKey: s3.S3_SECRET_ACCESS_KEY,
  };
}

export type Config = ReturnType<typeof loadConfig>;

export const config: Config = loadConfig();
