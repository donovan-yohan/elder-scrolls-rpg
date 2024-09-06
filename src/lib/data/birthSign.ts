import { Skill, SpellSkills } from '$lib/data/skill';

export enum BirthSignName {
	Apprentice = "Apprentice",
	Atronach = "Atronach",
	Lady = "Lady",
	Lord = "Lord",
	Lover = "Lover",
	Mage = "Mage",
	Ritual = "Ritual",
	Serpent = "Serpent",
	Shadow = "Shadow",
	Steed = "Steed",
	Thief = "Thief",
	Tower = "Tower",
	Warrior = "Warrior"
}

export const BirthSigns = {
	[BirthSignName.Apprentice]: {
		notes: 'Gain Advantage on all Spell Attacks, Gain Disadvantage on all spells attacking you'
	},
	[BirthSignName.Atronach]: {
		magickaRatio: 1.5,
		magickaRegenRatio: 0,
		notes: 'Base Magicka is 50% More, Do not regen magicka naturally, 50% all target spell cast on you give you their cost in Magicka',
	},
	[BirthSignName.Lady]: {
		skillAdvantages: [Skill.Speechcraft],
		skillDisadvantages: [Skill.Threaten],
	},
	[BirthSignName.Lord]: {
		notes: 'Regen Your level in HP each round, as long as your Magika is full, Disadvantages on all saves against fire, take double damage from it'
	},
	[BirthSignName.Lover]: {
		notes: 'Anyone you can get to consensually kiss you, is charmed and you gain advantage to all social checks on them to make them do anything for any reason. It must be an action they would still do (attack and enemy or perceived enemy, but not kill an innocent child)'
	},
	[BirthSignName.Mage]: {
		magickaRatio: 1.25,
		skillDisadvantages: [Skill.Speechcraft, Skill.Mercantilism]
	},
	[BirthSignName.Ritual]: {
		notes: 'Can cast one of any ritual already performed once per day without regard for location or time'
	},
	[BirthSignName.Serpent]: {
		notes: 'Whenever you would gain the party fortune points from ignoring a critical success, you may gamble to gain the point and keep the success. Roll a D20. If you roll your Crit range, you keep the points and keep the success. ( Or gain two fortune points and a normal success) If you fail, you must take the fortune point and no effect, as well as 1 misfortune point. If you roll in your critical failure range, you do not gain either the effect or the fortune point, but gain 1 misfortune.'
	},
	[BirthSignName.Shadow]: {
		skillAdvantages: [Skill.Sneak],
		skillDisadvantages: [Skill.Threaten],
	},
	[BirthSignName.Steed]: {
		actionPointRatio: 1.25,
		skillDisadvantages: [Skill.Intuition, Skill.Notice, Skill.Dexterity, Skill.Mechanics]
	},
	[BirthSignName.Thief]: {
		dodgeRatio: 2,
		armorDodgeCapBonus: 2,
	},
	[BirthSignName.Tower]: {
		skillAdvantages: [Skill.Mechanics],
		notes: 'Gain advantage on all Mechanics checks to pick locks and if you do the block action, the amount the opponent misses by, they take as reflected damage'
	},
	[BirthSignName.Warrior]: {
		skillDisadvantages: SpellSkills,
		healthBonus: 1.25
	}
}
