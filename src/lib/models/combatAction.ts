import type { ActionType, DiceRoll } from './combat';

/**
 * ActionPhase enum - tracks progress through action resolution
 */
export enum ActionPhase {
	SelectAction = 'SelectAction',
	SelectTarget = 'SelectTarget',
	RollAttack = 'RollAttack',
	RollDamage = 'RollDamage',
	ResolveEffect = 'ResolveEffect',
	Complete = 'Complete'
}

/**
 * PendingAction interface - an action being resolved
 */
export interface PendingAction {
	type: ActionType;
	weaponId?: string; // For Attack actions
	spellId?: string; // For CastSpell actions
	targetAC?: number; // Enemy AC for attack resolution
	targetDC?: number; // DC for spell checks
	phase: ActionPhase;
	attackRoll?: DiceRoll; // Result of attack roll
	skillCheckRoll?: DiceRoll; // Result of skill check (for spells)
	damageRoll?: DiceRoll; // Result of damage roll
	effectDescription?: string;
}

/**
 * AvailableAction interface - computed available action with eligibility
 */
export interface AvailableAction {
	type: ActionType;
	name: string; // Display name
	apCost: number;
	mpCost?: number; // For spells
	initiativeCost?: number; // For reactions
	isAvailable: boolean;
	unavailableReason?: string; // e.g., "Not enough AP", "Not enough MP"
	weaponId?: string; // For weapon attacks
	spellId?: string; // For spells
	description?: string; // Action description/tooltip
}

/**
 * Helper function to create a new pending action
 */
export function createPendingAction(
	type: ActionType,
	options?: Partial<Omit<PendingAction, 'type' | 'phase'>>
): PendingAction {
	return {
		type,
		phase: ActionPhase.SelectAction,
		...options
	};
}
