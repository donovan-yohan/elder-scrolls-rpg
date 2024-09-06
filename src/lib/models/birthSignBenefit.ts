import type { Skill } from '$lib/data/skill';

export interface BirthSignBenefit {
	skillAdvantages?: Skill[],
	skillDisadvantages?: Skill[],
	frostResist?: number,
	frostResistRatio?: number,
	fireResist?: number,
	fireResistRatio?: number,
	magickaRatio?: number,
	magickaRegenRatio?: number,
	actionPointRatio?: number,
	healthRatio?: number,
	dodgeRatio?: number,
	armorDodgeCapBonus?: number,
	notes?: string,
}
