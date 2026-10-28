import { z } from "zod";

export const languageListSchema = z.object({
  languages: z.array(z.object({ code: z.string(), count: z.number() })),
});
