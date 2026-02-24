import { z } from "zod/v4";

export const SettingsConfigSchema = z.object({
  permissions: z
    .object({
      allow: z.array(z.string()).optional(),
      deny: z.array(z.string()).optional(),
    })
    .optional(),
  defaultMode: z.string().optional(),
  env: z.record(z.string(), z.string()).optional(),
  hooks: z.record(z.string(), z.unknown()).optional(),
  model: z.string().optional(),
  allowedTools: z.array(z.string()).optional(),
});

export type SettingsConfig = z.infer<typeof SettingsConfigSchema>;
