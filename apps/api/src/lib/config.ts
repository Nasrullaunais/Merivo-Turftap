import { z } from "zod";

const DEFAULT_PORT = 3000;
const DEFAULT_AUTH_CACHE_SECONDS = 300;
const MIN_SECRET_LENGTH = 32;
export const DEFAULT_WHATSAPP_GRAPH_URL = "https://graph.facebook.com/v27.0";

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
  CONSOLE_URL: z.url().default("http://localhost:5174"),

  AUTH_PROVIDER: z.enum(["fake", "auth0"]).default("fake"),
  AUTH_CACHE_SECONDS: z.coerce.number().int().min(0).default(DEFAULT_AUTH_CACHE_SECONDS),
  AUTH0_DOMAIN: z.string().optional(),
  AUTH0_AUDIENCE: z.string().optional(),
  AUTH0_PHONE_CLAIM: z.string().default("phone_number"),
  AUTH0_HOOK_SECRET: z.string().optional(),
  ASSISTANT_API_KEY: z.string().min(MIN_SECRET_LENGTH),

  STORAGE_PROVIDER: z.enum(["fake", "s3"]).default("fake"),
  S3_ENDPOINT: z.url().optional(),
  S3_REGION: z.string().default("us-east-1"),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),

  MESSAGING_PROVIDER: z.enum(["fake", "whatsapp-cloud"]).default("fake"),
  WHATSAPP_GRAPH_URL: z.url().default(DEFAULT_WHATSAPP_GRAPH_URL),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  SMS_PROVIDER: z.enum(["fake"]).default("fake"),
  RECEIPT_READER: z.enum(["fake", "gemini"]).default("fake"),
  GEMINI_API_KEY: z.string().optional(),
  RECEIPT_READER_MODEL: z.string().default("gemini-3.8-flash"),
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
    env.SMS_PROVIDER,
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
    consoleUrl: env.CONSOLE_URL,
    auth: {
      cacheSeconds: env.AUTH_CACHE_SECONDS,
      provider: authProvider(env),
      hookSecret: env.AUTH0_HOOK_SECRET,
      assistantApiKey: env.ASSISTANT_API_KEY,
    },
    storage: storage(env),
    messaging: messaging(env),
    sms: { kind: env.SMS_PROVIDER },
    receiptReader: receiptReader(env),
  };
}

function authProvider(env: Env) {
  if (env.AUTH_PROVIDER === "fake") return { kind: "fake" as const };
  const auth0 = required(
    env,
    ["AUTH0_DOMAIN", "AUTH0_AUDIENCE", "AUTH0_HOOK_SECRET"],
    "AUTH_PROVIDER=auth0",
  );
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

function messaging(env: Env) {
  if (env.MESSAGING_PROVIDER === "fake") return { kind: "fake" as const };
  const meta = required(
    env,
    ["WHATSAPP_ACCESS_TOKEN", "WHATSAPP_PHONE_NUMBER_ID"],
    "MESSAGING_PROVIDER=whatsapp-cloud",
  );
  return {
    kind: "whatsapp-cloud" as const,
    graphUrl: env.WHATSAPP_GRAPH_URL,
    accessToken: meta.WHATSAPP_ACCESS_TOKEN,
    turftapPhoneNumberId: meta.WHATSAPP_PHONE_NUMBER_ID,
  };
}

function receiptReader(env: Env) {
  if (env.RECEIPT_READER === "fake") return { kind: "fake" as const };
  const gemini = required(env, ["GEMINI_API_KEY"], "RECEIPT_READER=gemini");
  return {
    kind: "gemini" as const,
    apiKey: gemini.GEMINI_API_KEY,
    model: env.RECEIPT_READER_MODEL,
  };
}

export type Config = ReturnType<typeof loadConfig>;

export const config: Config = loadConfig();
