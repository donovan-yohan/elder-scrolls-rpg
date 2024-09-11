import { fail, message, superValidate } from 'sveltekit-superforms'
import { zod } from 'sveltekit-superforms/adapters'
import type { Player } from '$lib/models/player'
import { playerSchema } from '$lib/schema/player.schema'

export const load = async () => {
	const form = await superValidate(zod(playerSchema))
	const newPlayer: Player | undefined = undefined

	// Always return { form } in load functions
	return { form, newPlayer }
}

export const actions = {
	default: async ({ request }) => {
		const form = await superValidate(request, zod(playerSchema))

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
