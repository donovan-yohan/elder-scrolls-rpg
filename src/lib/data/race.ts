export enum RaceName {
	Breton = 'Breton',
	Nord = 'Nord',
	Imperial = 'Imperial',
	Redguard = 'Redguard',
	Altmer = 'Altmer',
	Bosmer = 'Bosmer',
	Dunmer = 'Dunmer',
	Orsimer = 'Orsimer',
	Argonian = 'Argonian',
	Khajiit = 'Khajiit',
}

export const Race: Record<RaceName, { description: string }> = {
	[RaceName.Breton]: {
		description: 'Regenerate +1 MP per round\nNatural Spell resistance +5',
	},
	[RaceName.Nord]: {
		description: 'Natural Frost Spell Resistance +10\nImmunity to Non magical cold',
	},
	[RaceName.Imperial]: {
		description: 'Bonus Language \n+1 HP',
	},
	[RaceName.Redguard]: {
		description: 'Disease resistance 75%\nPoison Resistance 75%\n +1 AP',
	},
	[RaceName.Altmer]: {
		description: 'Disease resistance 25%\nSpell Weakness -5\n+4 MP',
	},
	[RaceName.Bosmer]: {
		description: 'Poison resistance 50%\nDisease resistance 50%\nBeast Tongue',
	},
	[RaceName.Dunmer]: {
		description: 'Natural Fire Spell Resistance +10\nImmunity to non magical heat',
	},
	[RaceName.Orsimer]: {
		description: '+2 HP\nNatural Spell resistance +2',
	},
	[RaceName.Argonian]: {
		description: 'Disease Immunity\nPoison Immunity\nAmphibious Swimmer',
	},
	[RaceName.Khajiit]: {
		description: 'Sharp Claws and Night eyes\n+1 AP',
	},
}
