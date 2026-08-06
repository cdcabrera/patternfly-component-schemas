// Auto-generated Zod schema for Hero
import { z } from 'zod'

export const HeroSchema = z.object({
  isGlass: z.unknown().optional().default(false)
})

export type HeroProps = z.infer<typeof HeroSchema>
