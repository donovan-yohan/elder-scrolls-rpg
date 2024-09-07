import type { Skill } from '$lib/data/skill'

export interface SubSkill {
	name: string
	parentSkill: Skill
	description: string
}
