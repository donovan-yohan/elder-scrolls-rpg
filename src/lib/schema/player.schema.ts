import { z } from 'zod'
import { RaceName } from '$lib/data/race'
import { ArchetypeName } from '$lib/data/archetype'
import { BirthSignName } from '$lib/data/birthSign'
import { Skill } from '$lib/data/skill'

export const playerSchema = z
	.object({
		characterName: z.string().min(1).default('John Scrolls'),
		race: z.nativeEnum(RaceName),
		archetype: z.nativeEnum(ArchetypeName),
		birthSign: z.nativeEnum(BirthSignName),
		majorSkills: z.array(z.nativeEnum(Skill)).max(6).min(6),
		minorSkills: z.array(z.nativeEnum(Skill)).max(6).min(6),
	})
	.refine((data) => {
		const majorSkills = new Set(data.majorSkills)
		const minorSkills = new Set(data.minorSkills)
		const allSkills = new Set([...majorSkills, ...minorSkills])

		return majorSkills.size === 6 && minorSkills.size === 6 && allSkills.size === 12
	})
