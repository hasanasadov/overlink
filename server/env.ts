// Must be the first import of server/index.ts: loads .env / .env.local the same way Next.js does.
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");
