import { fail, message, superValidate } from 'sveltekit-superforms'
import { zod } from 'sveltekit-superforms/adapters'
import { z } from 'zod'
import { ArchetypeName } from '$lib/data/archetype'
import { BirthSignName } from '$lib/data/birthSign'
import { RaceName } from '$lib/data/race'
import { Skill } from '$lib/data/skill'
import type { Player } from '$lib/models/player'

// Define outside the load function so the adapter can be cached
const schema = z
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

export const load = async () => {
	const form = await superValidate(zod(schema))
	const newPlayer: Player | undefined = undefined

	// Always return { form } in load functions
	return { form, newPlayer }
}

export const actions = {
	default: async ({ request }) => {
		const form = await superValidate(request, zod(schema))

		if (!form.valid) {
			// Again, return { form } and things will just work.
			return fail(400, { form })
		}

		const newPlayer: Player = {
			id: form.data.characterName,
			level: 1,
			playerName: 'Real John Scrolls',
			subSkills: [],
			health: 0,
			maxHealth: 0,
			actionPoints: 0,
			maxActionPoints: 0,
			magicka: 0,
			maxMagicka: 0,
			...form.data,
		}

		return message<Player>(form, newPlayer)
	},
}
