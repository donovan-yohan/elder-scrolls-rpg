import { fail, message, superValidate } from 'sveltekit-superforms'
import { zod } from 'sveltekit-superforms/adapters'
import type { PlayerData } from '$lib/models/player'
import { playerSchema } from '$lib/schema/player.schema'
import { createEmptySlot } from '$lib/util/equipment.util'
import { CHARACTER_SCHEMA_VERSION } from '$lib/version'

export const load = async () => {
	const form = await superValidate(zod(playerSchema))
	const newPlayer: PlayerData | undefined = undefined

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

		const now = new Date().toISOString()
		const newPlayer: PlayerData = {
			// Spread form data first
			...form.data,
			// Then override with computed/default values
			id: crypto.randomUUID(),
			schemaVersion: CHARACTER_SCHEMA_VERSION,
			level: 1,
			playerName: 'Real John Scrolls',
			subSkills: form.data.subSkills ?? [],
			health: 0,
			maxHealth: 0,
			actionPoints: 0,
			maxActionPoints: 0,
			magicka: 0,
			maxMagicka: 0,
			knownSpells: form.data.knownSpells ?? [],
			equipment: form.data.equipment ?? {
				weapon: createEmptySlot(),
				offhand: createEmptySlot(),
				armor: createEmptySlot(),
				accessories: [],
			},
			inventory: form.data.inventory ?? [],
			ownedWeapons: form.data.ownedWeapons ?? [],
			notes: form.data.notes ?? '',
			fortunePoints: 0,
			misfortunePoints: 0,
			createdAt: now,
			updatedAt: now,
		}

		return message<PlayerData>(form, newPlayer)
	},
}
