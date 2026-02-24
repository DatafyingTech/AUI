import { z } from "zod/v4";

export const AgentConfigSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  model: z.string().optional(),
  tools: z.array(z.string()).optional(),
  disallowedTools: z.array(z.string()).optional(),
  permissionMode: z
    .enum(["default", "acceptEdits", "bypassPermissions", "plan", "dontAsk"])
    .optional(),
  maxTurns: z.number().optional(),
  skills: z.array(z.string()).optional(),
  color: z.string().optional(),
  hooks: z.record(z.string(), z.unknown()).optional(),
  allowedCommands: z.array(z.string()).optional(),
});

export type AgentConfig = z.infer<typeof AgentConfigSchema>;
