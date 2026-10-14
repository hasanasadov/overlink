import type { NextConfig } from "next";

const config: NextConfig = {
  // Load yjs through Node (one shared instance) so route handlers don't pull in two copies.
  serverExternalPackages: ["yjs"],
  agentRules: false,
};

export default config;
