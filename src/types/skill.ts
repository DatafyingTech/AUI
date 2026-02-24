import { z } from "zod/v4";

export const SkillConfigSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  version: z.string().optional(),
  license: z.string().optional(),
});

export type SkillConfig = z.infer<typeof SkillConfigSchema>;
