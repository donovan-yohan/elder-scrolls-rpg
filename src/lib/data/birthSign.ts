import { Skill, SpellSkills } from '$lib/data/skill'
import type { BirthSignBenefit } from '$lib/models/birthSignBenefit'

export enum BirthSignName {
	Apprentice = 'Apprentice',
	Atronach = 'Atronach',
	Lady = 'Lady',
	Lord = 'Lord',
	Lover = 'Lover',
	Mage = 'Mage',
	Ritual = 'Ritual',
	Serpent = 'Serpent',
	Shadow = 'Shadow',
	Steed = 'Steed',
	Thief = 'Thief',
	Tower = 'Tower',
	Warrior = 'Warrior',
}

export const BirthSigns: Record<BirthSignName, BirthSignBenefit> = {
	[BirthSignName.Apprentice]: {
		description:
			"The Apprentice (known as the Automaton to the Dwemer) is a constellation of eleven stars which is in the night sky during Sun's Height. It is one of the Mage's charges. Those born under the sign of the Apprentice are thought to have an affinity for magic, but also a vulnerability to magic.",
		notes: 'Gain Advantage on all Spell Attacks, Gain Disadvantage on all spells attacking you',
	},
	[BirthSignName.Atronach]: {
		description:
			"The Atronach (sometimes the Golem, known as the Warmachine to the Dwemer) is a constellation of ten stars which is in the night sky during Sun's Dusk. It is one of the Mage's charges. Those born under the sign of the Atronach are thought to be natural sorcerers with deep reserves of magicka, but that cannot generate their own magicka.",
		magickaRatio: 1.5,
		magickaRegenRatio: 0,
		notes:
			'Base Magicka is 50% More, Do not regen magicka naturally, 50% all target spell cast on you give you their cost in Magicka',
	},
	[BirthSignName.Lady]: {
		description:
			"The Lady is a constellation of four stars which is in the night sky during Hearthfire. It is one of the Warrior's charges. Those born under the sign of the Lady are thought to be kind and tolerant.",
		skillAdvantages: [Skill.Speechcraft],
		skillDisadvantages: [Skill.Threaten],
	},
	[BirthSignName.Lord]: {
		description:
			"The Lord is a constellation of nineteen stars which is visible in the night sky during First Seed. It is one of the Warrior's charges. Those born under the sign of the Lord are thought to be stronger and healthier, although they are sometimes referred to as Trollkin due to their innate weakness to fire.",
		notes:
			'Regen Your level in HP each round, as long as your Magika is full, Disadvantages on all saves against fire, take double damage from it',
	},
	[BirthSignName.Lover]: {
		description:
			"The Lover is a constellation of twelve stars which is in the night sky during Sun's Dawn. It is one of the Thief's charges. Those born under the sign of the Lover are thought to be graceful and passionate.",
		notes:
			'Anyone you can get to consensually kiss you, is charmed and you gain advantage to all social checks on them to make them do anything for any reason. It must be an action they would still do (attack and enemy or perceived enemy, but not kill an innocent child)',
	},
	[BirthSignName.Mage]: {
		description:
			"The Mage (also known as The Sage, known as the Mechanist to the Dwemer and the Witch in the Stars or simply the Witch to the Reachmen) is a constellation of twenty-seven stars and the planet Julianos which is in the night sky during Rain's Hand. It is a Guardian constellation, and its charges are the Apprentice, the Atronach, and the Ritual. Those born under the sign of the Mage are thought to have more magicka and a talent for spellcasting. They are also thought to be arrogant and absent-minded.",
		magickaRatio: 1.25,
		skillDisadvantages: [Skill.Speechcraft, Skill.Mercantilism],
	},
	[BirthSignName.Ritual]: {
		description:
			"The Ritual (known as the Laboratory to the Dwemer) is a constellation of seven stars which is in the night sky during Morning Star. It is one of the Mage's charges. Those born under the sign of the Ritual are thought to have various abilities depending on the aspects of the moons and planets.",
		notes:
			'Can cast one of any ritual already performed once per day without regard for location or time',
	},
	[BirthSignName.Serpent]: {
		description:
			"The Serpent (known as the Snake in the Stars to the Reachmen, or simply the Snake to both Reachmen and Redguards) is a constellation of four unstars which is not relegated to being in the night sky during a particular time of the year. Unlike stars, the unstars that form the Serpent move about the sky and do not emit variance. The Serpent's motions are considered to be unpredictable, though they can be predicted to a degree. Those born under the sign of the Serpent are thought to have no characteristics in common except being the most blessed and the most cursed.",
		notes:
			'Whenever you would gain the party fortune points from ignoring a critical success, you may gamble to gain the point and keep the success. Roll a D20. If you roll your Crit range, you keep the points and keep the success. ( Or gain two fortune points and a normal success) If you fail, you must take the fortune point and no effect, as well as 1 misfortune point. If you roll in your critical failure range, you do not gain either the effect or the fortune point, but gain 1 misfortune.',
	},
	[BirthSignName.Shadow]: {
		description:
			"The Shadow is a constellation of five stars which is in the night sky during Second Seed. It is one of the Thief's charges. Those born under the sign of the Shadow are thought to have the ability to hide in shadows.",
		skillAdvantages: [Skill.Sneak],
		skillDisadvantages: [Skill.Threaten],
	},
	[BirthSignName.Steed]: {
		description:
			"The Steed is a constellation of eight stars which is in the night sky during Midyear. It is one of the Warrior's charges. Those born under the sign of the Steed are thought to be impatient and always hurrying from one place to another. It is typically depicted as a horse. According to some the Steed is prominent in the southern sky during the summer solstice.",
		actionPointRatio: 1.25,
		skillDisadvantages: [Skill.Intuition, Skill.Notice, Skill.Dexterity, Skill.Mechanics],
	},
	[BirthSignName.Thief]: {
		description:
			'The Thief (known as the Hunter to the Reachmen) is a constellation of eighteen or seventeen stars and the planet Arkay which is in the night sky during Evening Star. It is a Guardian constellation, and its charges are the Lover, the Shadow, and the Tower. Those born under the sign of the Thief are thought to take risks and evade harm. Their luck is thought to run out eventually, cutting their lives short.',
		dodgeRatio: 2,
		armorDodgeCapBonus: 2,
	},
	[BirthSignName.Tower]: {
		description:
			"The Tower is a constellation of twelve or eleven stars which is in the night sky during Frostfall. It is one of the Thief's charges. Those born under the sign of the Tower are thought to have a knack for finding gold and opening locks.",
		skillAdvantages: [Skill.Mechanics],
		notes:
			'Gain advantage on all Mechanics checks to pick locks and if you do the block action, the amount the opponent misses by, they take as reflected damage',
	},
	[BirthSignName.Warrior]: {
		description:
			'The Warrior (known as the Headsman to the Reachmen) is a constellation of thirty or twenty-eight stars and the planet Akatosh which is in the night sky during Last Seed. It is one of the Guardian constellations, and its charges are the Lady, the Steed, and the Lord. Those born under the sign of the Warrior are thought to be short-tempered and skilled with weapons.',
		skillDisadvantages: SpellSkills,
		healthRatio: 1.25,
	},
}
