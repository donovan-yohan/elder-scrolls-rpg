export type CritFailContext =
	| 'attack'
	| 'spell'
	| 'dodge'
	| 'block'
	| 'focus-attack'
	| 'focus-spell'
	| 'skill-check'
	| string

export interface CritFailConsequences {
	acceptConsequences: string
	storedConsequences: string
}

/**
 * Gets the consequences description for accepting vs storing a critical failure
 * based on the context of the roll
 */
export function getCritFailConsequences(context: CritFailContext): CritFailConsequences {
	switch (context) {
		case 'attack':
			return {
				acceptConsequences: 'Attack misses and you may take self-damage or drop weapon',
				storedConsequences: 'Attack counts as a normal miss',
			}
		case 'spell':
			return {
				acceptConsequences: 'Spell fizzles, MP is lost, and you may suffer magical backlash',
				storedConsequences: 'Spell fails but only costs half MP',
			}
		case 'dodge':
			return {
				acceptConsequences: 'Full damage taken and you become disoriented',
				storedConsequences: 'Full damage taken (no disorientation)',
			}
		case 'block':
			return {
				acceptConsequences: 'Full damage taken and shield may be damaged',
				storedConsequences: 'Full damage taken (shield intact)',
			}
		case 'focus-attack':
			return {
				acceptConsequences: 'Become disoriented, party loses 1 initiative, enemy gains 1',
				storedConsequences: 'Become disoriented only (no initiative change)',
			}
		case 'focus-spell':
			return {
				acceptConsequences: 'Unfocused with disadvantage and lose extra MP',
				storedConsequences: 'Unfocused with disadvantage only',
			}
		case 'skill-check':
		default:
			return {
				acceptConsequences: 'Check fails critically with severe consequences',
				storedConsequences: 'Check counts as a normal failure',
			}
	}
}

/**
 * Formats the roll context for display in the modal
 */
export function formatRollContext(context: CritFailContext): string {
	switch (context) {
		case 'attack':
			return 'Attack Roll'
		case 'spell':
			return 'Spell Cast'
		case 'dodge':
			return 'Dodge Check'
		case 'block':
			return 'Block Check'
		case 'focus-attack':
			return 'Focus Attack Check'
		case 'focus-spell':
			return 'Focus Spell Check'
		case 'skill-check':
			return 'Skill Check'
		default:
			return context.charAt(0).toUpperCase() + context.slice(1)
	}
}
