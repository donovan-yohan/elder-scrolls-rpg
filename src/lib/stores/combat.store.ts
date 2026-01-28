import { writable, derived, get } from 'svelte/store'
import { browser } from '$app/environment'
import type { CombatSession, CombatLogEntry, ActiveCondition } from '$lib/models/combat'
import { CombatDistance, createCombatLogEntry } from '$lib/models/combat'
import { tickConditions } from '$lib/util/combat.util'
import {
  executeTurnStartEffects,
  executeTurnEndEffects,
  executeDamageTakenEffects,
} from '$lib/services/effectAggregator'
import type { EffectResult } from '$lib/models/effect'
import { EffectActionType } from '$lib/models/effect'
import type { PlayerData, Equipment } from '$lib/models/player'

const COMBAT_STORAGE_KEY = 'combat-sessions'

type CombatSessionsState = Record<string, CombatSession>

function loadFromStorage(): CombatSessionsState {
	if (!browser) return {}

	const stored = localStorage.getItem(COMBAT_STORAGE_KEY)
	if (!stored) return {}

	try {
		return JSON.parse(stored)
	} catch {
		return {}
	}
}

function saveToStorage(state: CombatSessionsState): void {
	if (!browser) return
	localStorage.setItem(COMBAT_STORAGE_KEY, JSON.stringify(state))
}

function createCombatStore() {
	const initialState = loadFromStorage()
	const { subscribe, set, update } = writable<CombatSessionsState>(initialState)

	// Auto-persist on changes
	subscribe((state) => {
		saveToStorage(state)
	})

	function applyEffectResults(
		session: CombatSession,
		results: EffectResult[],
		player: PlayerData
	): { updatedSession: CombatSession; logEntries: CombatLogEntry[] } {
		let updatedSession = { ...session }
		const logEntries: CombatLogEntry[] = []

		for (const result of results) {
			if (!result.success) continue

			for (const actionResult of result.actions) {
				if (!actionResult.applied) continue

				const { action, value, message } = actionResult

				switch (action.type) {
					case EffectActionType.Heal:
						const healAmount = Math.min(value ?? 0, player.maxHealth - updatedSession.currentHP)
						updatedSession = { ...updatedSession, currentHP: updatedSession.currentHP + healAmount }
						if (healAmount > 0) {
							logEntries.push(createCombatLogEntry('healing', message, { healing: healAmount }))
						}
						break

					case EffectActionType.Damage:
						updatedSession = {
							...updatedSession,
							currentHP: Math.max(0, updatedSession.currentHP - (value ?? 0)),
						}
						logEntries.push(createCombatLogEntry('damage', message, { damage: value }))
						break

					case EffectActionType.RestoreMP:
						const restoreAmount = Math.min(value ?? 0, player.maxMagicka - updatedSession.currentMP)
						updatedSession = { ...updatedSession, currentMP: updatedSession.currentMP + restoreAmount }
						if (restoreAmount > 0) {
							logEntries.push(createCombatLogEntry('system', message))
						}
						break

					case EffectActionType.DrainMP:
						updatedSession = {
							...updatedSession,
							currentMP: Math.max(0, updatedSession.currentMP - (value ?? 0)),
						}
						logEntries.push(createCombatLogEntry('system', message))
						break

					case EffectActionType.LogMessage:
						logEntries.push(createCombatLogEntry('system', message))
						break

					// Other action types would be handled here as needed
				}
			}
		}

		return { updatedSession, logEntries }
	}

	return {
		subscribe,

		/**
		 * Start a new combat session for a player
		 */
		startCombat: (
			playerId: string,
			partyInitiative: number,
			enemyInitiative: number,
			playerData: { health: number; magicka: number; maxActionPoints: number; equipment?: Equipment }
		): void => {
			update((state) => {
				// Create a deep copy of equipment to avoid mutations
				const equipmentSnapshot: Equipment = playerData.equipment
					? {
							weapon: { ...playerData.equipment.weapon },
							offhand: { ...playerData.equipment.offhand },
							armor: { ...playerData.equipment.armor },
							accessories: [...playerData.equipment.accessories],
						}
					: {
							weapon: { id: null, materialId: null },
							offhand: { id: null, materialId: null },
							armor: { id: null, materialId: null },
							accessories: [],
						}

				const session: CombatSession = {
					id: crypto.randomUUID(),
					playerId,
					round: 0,
					isPlayerTurn: false,
					partyInitiativePool: { current: partyInitiative, max: partyInitiative },
					enemyInitiativePool: { current: enemyInitiative, max: enemyInitiative },
					currentHP: playerData.health,
					currentMP: playerData.magicka,
					currentAP: playerData.maxActionPoints,
					maxAP: playerData.maxActionPoints,
					conditions: [],
					log: [createCombatLogEntry('system', 'Combat started!')],
					distance: CombatDistance.Medium,
					concentrationSpellId: undefined,
					isConcentrationBroken: false,
					combatEquipment: equipmentSnapshot,
				}
				return { ...state, [playerId]: session }
			})
		},

		/**
		 * End combat session for a player
		 */
		endCombat: (playerId: string): { health: number; magicka: number; equipment: Equipment } | null => {
			let finalState: { health: number; magicka: number; equipment: Equipment } | null = null

			update((state) => {
				const session = state[playerId]
				if (session) {
					finalState = {
						health: session.currentHP,
						magicka: session.currentMP,
						equipment: session.combatEquipment,
					}
				}
				const newState = { ...state }
				delete newState[playerId]
				return newState
			})

			return finalState
		},

		/**
		 * Add a log entry
		 */
		addLogEntry: (playerId: string, entry: CombatLogEntry): void => {
			update((state) => {
				const session = state[playerId]
				if (!session) return state
				return {
					...state,
					[playerId]: {
						...session,
						log: [...session.log, entry]
					}
				}
			})
		},

		/**
		 * Spend AP
		 */
		spendAP: (playerId: string, amount: number): void => {
			update((state) => {
				const session = state[playerId]
				if (!session) return state
				return {
					...state,
					[playerId]: {
						...session,
						currentAP: Math.max(0, session.currentAP - amount)
					}
				}
			})
		},

		/**
		 * Spend MP
		 */
		spendMP: (playerId: string, amount: number): void => {
			update((state) => {
				const session = state[playerId]
				if (!session) return state
				return {
					...state,
					[playerId]: {
						...session,
						currentMP: Math.max(0, session.currentMP - amount)
					}
				}
			})
		},

		/**
		 * Gain AP (e.g., from crit refund)
		 */
		gainAP: (playerId: string, amount: number): void => {
			update((state) => {
				const session = state[playerId]
				if (!session) return state
				return {
					...state,
					[playerId]: {
						...session,
						currentAP: Math.min(session.maxAP, session.currentAP + amount)
					}
				}
			})
		},

		/**
		 * Gain MP (e.g., from crit refund)
		 */
		gainMP: (playerId: string, amount: number): void => {
			update((state) => {
				const session = state[playerId]
				if (!session) return state
				// Note: We don't cap at maxMP here as player.maxMagicka isn't available
				// The caller should handle capping if needed
				return {
					...state,
					[playerId]: {
						...session,
						currentMP: session.currentMP + amount
					}
				}
			})
		},

		/**
		 * Spend party initiative
		 */
		spendInitiative: (playerId: string, amount: number): void => {
			update((state) => {
				const session = state[playerId]
				if (!session) return state
				const newCurrent = Math.max(0, session.partyInitiativePool.current - amount)
				return {
					...state,
					[playerId]: {
						...session,
						partyInitiativePool: {
							...session.partyInitiativePool,
							current: newCurrent,
						},
					}
				}
			})
		},

		/**
		 * Gain initiative
		 */
		gainInitiative: (playerId: string, amount: number): void => {
			update((state) => {
				const session = state[playerId]
				if (!session) return state
				const newCurrent = Math.min(
					session.partyInitiativePool.max,
					session.partyInitiativePool.current + amount
				)
				return {
					...state,
					[playerId]: {
						...session,
						partyInitiativePool: {
							...session.partyInitiativePool,
							current: newCurrent,
						},
					}
				}
			})
		},

		/**
		 * Adjust enemy initiative (can be positive or negative)
		 */
		adjustEnemyInitiative: (playerId: string, delta: number): void => {
			update((state) => {
				const session = state[playerId]
				if (!session) return state
				const newCurrent = Math.max(0, Math.min(
					session.enemyInitiativePool.max,
					session.enemyInitiativePool.current + delta
				))
				return {
					...state,
					[playerId]: {
						...session,
						enemyInitiativePool: {
							...session.enemyInitiativePool,
							current: newCurrent,
						},
					}
				}
			})
		},

		/**
		 * Take damage
		 */
		takeDamage: (playerId: string, amount: number): void => {
			update((state) => {
				const session = state[playerId]
				if (!session) return state
				const newHP = Math.max(0, session.currentHP - amount)
				return {
					...state,
					[playerId]: {
						...session,
						currentHP: newHP,
						log: [...session.log, createCombatLogEntry('damage', `Took ${amount} damage`, { damage: amount })]
					}
				}
			})
		},

		/**
		 * Take damage with effect processing (damage modifiers, resistances)
		 */
		takeDamageWithEffects: (
			playerId: string,
			player: PlayerData,
			amount: number,
			damageType: string
		): void => {
			update((state) => {
				const session = state[playerId]
				if (!session) return state

				// Execute damage effects (may modify damage)
				const results = executeDamageTakenEffects(player, session, amount, damageType)

				// Calculate final damage after effects
				let finalDamage = amount
				for (const result of results) {
					if (!result.success) continue
					for (const actionResult of result.actions) {
						if (actionResult.action.type === EffectActionType.ModifyIncomingDamage) {
							if (actionResult.action.multiplier !== undefined) {
								finalDamage *= actionResult.action.multiplier
							}
							if (actionResult.action.value !== undefined) {
								finalDamage += actionResult.action.value
							}
						}
					}
				}

				finalDamage = Math.max(0, Math.floor(finalDamage))

				const newHP = Math.max(0, session.currentHP - finalDamage)
				const logEntries: CombatLogEntry[] = []

				// Log effect sources
				for (const result of results) {
					if (!result.success) continue
					for (const actionResult of result.actions) {
						if (actionResult.message && actionResult.applied) {
							logEntries.push(createCombatLogEntry('system', actionResult.message))
						}
					}
				}

				// Log final damage
				logEntries.push(
					createCombatLogEntry('damage', `Took ${finalDamage} ${damageType} damage`, {
						damage: finalDamage,
					})
				)

				return {
					...state,
					[playerId]: {
						...session,
						currentHP: newHP,
						log: [...session.log, ...logEntries],
					},
				}
			})
		},

		/**
		 * Heal HP
		 */
		heal: (playerId: string, amount: number, maxHP: number): void => {
			update((state) => {
				const session = state[playerId]
				if (!session) return state
				const newHP = Math.min(maxHP, session.currentHP + amount)
				const actualHealing = newHP - session.currentHP
				return {
					...state,
					[playerId]: {
						...session,
						currentHP: newHP,
						log: [...session.log, createCombatLogEntry('healing', `Healed ${actualHealing} HP`, { healing: actualHealing })]
					}
				}
			})
		},

		/**
		 * Add a condition
		 */
		addCondition: (playerId: string, condition: ActiveCondition): void => {
			update((state) => {
				const session = state[playerId]
				if (!session) return state
				return {
					...state,
					[playerId]: {
						...session,
						conditions: [...session.conditions, condition],
						log: [...session.log, createCombatLogEntry('condition', `Gained condition: ${condition.type}`)]
					}
				}
			})
		},

		/**
		 * Remove a condition by type
		 */
		removeCondition: (playerId: string, conditionType: string): void => {
			update((state) => {
				const session = state[playerId]
				if (!session) return state
				return {
					...state,
					[playerId]: {
						...session,
						conditions: session.conditions.filter(c => c.type !== conditionType),
						log: [...session.log, createCombatLogEntry('condition', `Removed condition: ${conditionType}`)]
					}
				}
			})
		},

		/**
		 * End player turn - tick conditions, execute turn end effects, advance round if needed
		 */
		endPlayerTurn: (playerId: string, player?: PlayerData): void => {
			update((state) => {
				const session = state[playerId]
				if (!session) return state

				let updatedSession = { ...session }
				const logEntries: CombatLogEntry[] = []

				// Execute turn end effects if player provided
				if (player) {
					const results = executeTurnEndEffects(player, updatedSession)
					const applied = applyEffectResults(updatedSession, results, player)
					updatedSession = applied.updatedSession
					logEntries.push(...applied.logEntries)
				}

				// Tick conditions
				const newConditions = tickConditions(updatedSession.conditions)

				return {
					...state,
					[playerId]: {
						...updatedSession,
						isPlayerTurn: false,
						conditions: newConditions,
						log: [...updatedSession.log, ...logEntries, createCombatLogEntry('turn', 'Player turn ended')],
					},
				}
			})
		},

		/**
		 * Start player turn - reset AP, advance round, execute turn start effects
		 */
		startPlayerTurn: (playerId: string, player?: PlayerData): void => {
			update((state) => {
				const session = state[playerId]
				if (!session) return state

				// Reset AP and advance round
				let updatedSession = {
					...session,
					isPlayerTurn: true,
					currentAP: session.maxAP,
					round: session.round + 1,
				}

				// Execute turn start effects if player data is provided
				if (player) {
					const results = executeTurnStartEffects(player, updatedSession)
					const { updatedSession: finalSession, logEntries } = applyEffectResults(
						updatedSession,
						results,
						player
					)
					updatedSession = finalSession

					// Add standard turn start log plus effect logs
					const turnLog = createCombatLogEntry('turn', `Round ${session.round + 1} - Player turn started`)

					return {
						...state,
						[playerId]: {
							...updatedSession,
							log: [...updatedSession.log, turnLog, ...logEntries],
						},
					}
				}

				// Fallback if no player provided (backwards compatibility)
				return {
					...state,
					[playerId]: {
						...updatedSession,
						log: [...updatedSession.log, createCombatLogEntry('turn', `Round ${session.round + 1} - Player turn started`)],
					},
				}
			})
		},

		/**
		 * Set combat distance
		 */
		setDistance: (playerId: string, distance: CombatDistance): void => {
			update((state) => {
				const session = state[playerId]
				if (!session) return state
				return {
					...state,
					[playerId]: {
						...session,
						distance,
						log: [...session.log, createCombatLogEntry('action', `Moved to ${distance} range`)]
					}
				}
			})
		},

		/**
		 * Set concentration spell
		 */
		setConcentration: (playerId: string, spellId: string | undefined): void => {
			update((state) => {
				const session = state[playerId]
				if (!session) return state
				return {
					...state,
					[playerId]: {
						...session,
						concentrationSpellId: spellId,
						isConcentrationBroken: false
					}
				}
			})
		},

		/**
		 * Swap weapon during combat (costs 1 AP)
		 */
		swapWeapon: (
			playerId: string,
			data: { weaponId: string; materialId: string | null; slot: 'weapon' | 'offhand' }
		): void => {
			update((state) => {
				const session = state[playerId]
				if (!session) return state

				const SWAP_COST = 1
				if (session.currentAP < SWAP_COST) return state

				const newEquipment: Equipment = {
					...session.combatEquipment,
					[data.slot]: {
						id: data.weaponId,
						materialId: data.materialId,
					},
				}

				const slotLabel = data.slot === 'weapon' ? 'main hand' : 'off-hand'

				return {
					...state,
					[playerId]: {
						...session,
						currentAP: session.currentAP - SWAP_COST,
						combatEquipment: newEquipment,
						log: [
							...session.log,
							createCombatLogEntry('action', `Swapped ${slotLabel} weapon`),
						],
					},
				}
			})
		},

		/**
		 * Get session for a player
		 */
		getSession: (playerId: string): CombatSession | undefined => {
			return get({ subscribe })[playerId]
		},

		/**
		 * Check if player is in combat
		 */
		isInCombat: (playerId: string): boolean => {
			return !!get({ subscribe })[playerId]
		}
	}
}

export const combatStore = createCombatStore()

/**
 * Derived store to get session for a specific player
 */
export function getCombatSessionStore(playerId: string) {
	return derived(combatStore, ($store) => $store[playerId])
}

/**
 * Derived store to check if player is in combat
 */
export function getIsInCombatStore(playerId: string) {
	return derived(combatStore, ($store) => !!$store[playerId])
}
