import type { PlayerData } from '$lib/models/player'
import type { CombatSession, ActiveCondition } from '$lib/models/combat'
import { ActionType, ConditionType, CombatDistance } from '$lib/models/combat'
import type { AvailableAction } from '$lib/models/combatAction'
import { getWeaponById, type Weapon } from '$lib/data/weapons'
import { getSpellById } from '$lib/data/spells'

/**
 * Distance order for calculating movement costs
 */
const DISTANCE_ORDER: CombatDistance[] = [
  CombatDistance.Immediate,
  CombatDistance.Adjacent,
  CombatDistance.Close,
  CombatDistance.Short,
  CombatDistance.Medium,
  CombatDistance.Long,
  CombatDistance.Extreme
]

/**
 * Get AP cost to move between distances
 * Each step costs 1 AP, moving closer or farther
 */
export function getMovementAPCost(from: CombatDistance, to: CombatDistance): number {
  const fromIndex = DISTANCE_ORDER.indexOf(from)
  const toIndex = DISTANCE_ORDER.indexOf(to)
  return Math.abs(toIndex - fromIndex)
}

/**
 * Get all available actions for a player in current combat state
 */
export function getAvailableActions(
  player: PlayerData,
  session: CombatSession
): AvailableAction[] {
  const actions: AvailableAction[] = []

  // Weapon attacks
  if (player.equipment.weapon.id) {
    const weapon = getWeaponById(player.equipment.weapon.id)
    if (weapon) {
      const canAfford = session.currentAP >= weapon.apCost
      actions.push({
        type: ActionType.Attack,
        name: `Attack with ${weapon.name}`,
        apCost: weapon.apCost,
        isAvailable: canAfford,
        unavailableReason: canAfford ? undefined : `Need ${weapon.apCost} AP`,
        weaponId: weapon.id,
        description: `${weapon.baseDamageLethal ?? weapon.baseDamageBlunted} base damage`
      })
    }
  }

  // Spells
  for (const spellId of player.knownSpells) {
    const spell = getSpellById(spellId)
    if (spell) {
      const canAffordAP = session.currentAP >= spell.apCost
      const canAffordMP = session.currentMP >= spell.mpCost
      const isAvailable = canAffordAP && canAffordMP

      let unavailableReason: string | undefined
      if (!canAffordAP) unavailableReason = `Need ${spell.apCost} AP`
      else if (!canAffordMP) unavailableReason = `Need ${spell.mpCost} MP`

      actions.push({
        type: ActionType.CastSpell,
        name: spell.name,
        apCost: spell.apCost,
        mpCost: spell.mpCost,
        isAvailable,
        unavailableReason,
        spellId: spell.id,
        description: spell.description
      })
    }
  }

  // Movement options
  const currentIndex = DISTANCE_ORDER.indexOf(session.distance)

  // Move closer
  if (currentIndex > 0) {
    const closerDistance = DISTANCE_ORDER[currentIndex - 1]
    const cost = 1
    actions.push({
      type: ActionType.Move,
      name: `Move to ${closerDistance}`,
      apCost: cost,
      isAvailable: session.currentAP >= cost,
      unavailableReason: session.currentAP >= cost ? undefined : 'Need 1 AP',
      description: `Move from ${session.distance} to ${closerDistance}`
    })
  }

  // Move farther
  if (currentIndex < DISTANCE_ORDER.length - 1) {
    const fartherDistance = DISTANCE_ORDER[currentIndex + 1]
    const cost = 1
    actions.push({
      type: ActionType.Move,
      name: `Move to ${fartherDistance}`,
      apCost: cost,
      isAvailable: session.currentAP >= cost,
      unavailableReason: session.currentAP >= cost ? undefined : 'Need 1 AP',
      description: `Move from ${session.distance} to ${fartherDistance}`
    })
  }

  // Reactions (cost initiative, not AP)
  const hasInitiative = session.partyInitiativePool.current >= 1
  const initiativeReason = hasInitiative ? undefined : 'Need 1 Initiative'

  actions.push({
    type: ActionType.Dodge,
    name: 'Dodge',
    apCost: 0,
    initiativeCost: 1,
    isAvailable: hasInitiative,
    unavailableReason: initiativeReason,
    description: 'Use Athletics to avoid an attack'
  })

  actions.push({
    type: ActionType.Block,
    name: 'Block',
    apCost: 0,
    initiativeCost: 1,
    isAvailable: hasInitiative,
    unavailableReason: initiativeReason,
    description: 'Use Blocking skill to reduce damage'
  })

  // Utility actions
  actions.push({
    type: ActionType.SwapWeapon,
    name: 'Swap Weapon',
    apCost: 1,
    isAvailable: session.currentAP >= 1,
    unavailableReason: session.currentAP >= 1 ? undefined : 'Need 1 AP',
    description: 'Switch to a different weapon'
  })

  return actions
}

/**
 * Calculate weapon damage based on attack roll vs AC
 */
export function calculateWeaponDamage(
  weapon: Weapon,
  attackTotal: number,
  targetAC: number,
  isCritical: boolean = false
): { baseDamage: number; bonusDamage: number; total: number } {
  const baseDamage = weapon.baseDamageLethal ?? weapon.baseDamageBlunted

  // Bonus damage = attack total - target AC, capped at weapon's max
  let bonusDamage = Math.max(0, attackTotal - targetAC)
  bonusDamage = Math.min(bonusDamage, weapon.maxBonusDamage)

  // Critical doubles base damage
  const finalBase = isCritical ? baseDamage * 2 : baseDamage

  return {
    baseDamage: finalBase,
    bonusDamage,
    total: finalBase + bonusDamage
  }
}

/**
 * Process conditions at end of turn - reduce durations
 */
export function tickConditions(conditions: ActiveCondition[]): ActiveCondition[] {
  return conditions
    .map(condition => {
      if (condition.duration === undefined) {
        // Permanent condition, keep as-is
        return condition
      }
      return {
        ...condition,
        duration: condition.duration - 1
      }
    })
    .filter(condition => condition.duration === undefined || condition.duration > 0)
}

/**
 * Get human-readable description of a condition's effect
 */
export function getConditionEffect(condition: ActiveCondition): string {
  switch (condition.type) {
    case ConditionType.Stunned:
      return 'Cannot take actions'
    case ConditionType.Prone:
      return 'Disadvantage on attacks, advantage to hit in melee'
    case ConditionType.Grappled:
      return 'Speed is 0, disadvantage on attacks'
    case ConditionType.Frightened:
      return 'Disadvantage on checks while source is visible'
    case ConditionType.Poisoned:
      return `${condition.level ?? 1} damage per turn`
    case ConditionType.Burning:
      return `${condition.level ?? 1} fire damage per turn`
    case ConditionType.Frozen:
      return 'Speed halved, disadvantage on Dexterity'
    case ConditionType.Bleeding:
      return `${condition.level ?? 1} damage per turn`
    case ConditionType.Concentrating:
      return `Maintaining ${condition.source ?? 'a spell'}`
    default:
      return 'Unknown effect'
  }
}
