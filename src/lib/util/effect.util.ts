import type { PlayerData } from '$lib/models/player'
import {
  EffectConditionType,
  EffectActionType,
  EffectTrigger,
  type Effect,
  type EffectCondition,
  type EffectAction,
  type EffectContext,
  type EffectResult,
  type ActionResult,
} from '$lib/models/effect'

export function evaluateCondition(
  condition: EffectCondition,
  context: EffectContext
): boolean {
  switch (condition.type) {
    case EffectConditionType.Always:
      return true
    case EffectConditionType.MagickaFull:
      return context.session.currentMP >= context.player.maxMagicka
    case EffectConditionType.MagickaEmpty:
      return context.session.currentMP === 0
    case EffectConditionType.HealthBelow:
      const healthPercent = (context.session.currentHP / context.player.maxHealth) * 100
      return healthPercent < (condition.threshold ?? 50)
    case EffectConditionType.HealthAbove:
      const healthPct = (context.session.currentHP / context.player.maxHealth) * 100
      return healthPct > (condition.threshold ?? 50)
    case EffectConditionType.HasCondition:
      return context.session.conditions.some(c => c.type === condition.conditionType)
    case EffectConditionType.LacksCondition:
      return !context.session.conditions.some(c => c.type === condition.conditionType)
    case EffectConditionType.DamageType:
      return context.damageType === condition.damageType
    case EffectConditionType.SkillType:
      return context.skill === condition.skillType
    case EffectConditionType.SpellSchool:
      return false // TODO: implement with spell lookup
    case EffectConditionType.IsConcentrating:
      return !!context.session.concentrationSpellId
    case EffectConditionType.Random:
      return Math.random() * 100 < (condition.chance ?? 50)
    default:
      return false
  }
}

// Evaluate all conditions (AND logic)
export function evaluateAllConditions(
  conditions: EffectCondition[],
  context: EffectContext
): boolean {
  if (conditions.length === 0) return true
  return conditions.every(c => evaluateCondition(c, context))
}

export function calculateActionValue(
  action: EffectAction,
  context: EffectContext
): number {
  let value = action.value ?? 0
  if (action.usesLevel) {
    value = context.player.level
  }
  return value
}

// Format effect message for combat log with source attribution
export function formatEffectMessage(
  effect: Effect,
  action: EffectAction,
  value?: number
): string {
  const sourceName = effect.source.name
  let actionDesc = ''

  switch (action.type) {
    case EffectActionType.Heal:
      actionDesc = `healed ${value} HP`
      break
    case EffectActionType.Damage:
      actionDesc = `took ${value} ${action.damageType ?? ''} damage`
      break
    case EffectActionType.RestoreMP:
      actionDesc = `restored ${value} MP`
      break
    case EffectActionType.DrainMP:
      actionDesc = `lost ${value} MP`
      break
    case EffectActionType.ModifyAP:
      actionDesc = value && value > 0 ? `gained ${value} AP` : `lost ${Math.abs(value ?? 0)} AP`
      break
    case EffectActionType.GrantAdvantage:
      actionDesc = `gained ${action.advantageCount ?? 1} advantage`
      break
    case EffectActionType.GrantDisadvantage:
      actionDesc = `gained ${action.advantageCount ?? 1} disadvantage`
      break
    case EffectActionType.ApplyCondition:
      actionDesc = `gained ${action.conditionType}${action.conditionLevel ? ` (${action.conditionLevel})` : ''}`
      break
    case EffectActionType.RemoveCondition:
      actionDesc = `lost ${action.conditionType}`
      break
    case EffectActionType.ModifyIncomingDamage:
      const mult = action.multiplier ?? 1
      actionDesc = mult > 1 ? `takes ${mult}x damage` : `takes ${mult}x damage (reduced)`
      break
    case EffectActionType.AbsorbSpellMP:
      actionDesc = `absorbed ${value} MP from spell`
      break
    case EffectActionType.ReflectDamage:
      actionDesc = `reflected ${value} damage`
      break
    case EffectActionType.LogMessage:
      return action.message?.replace('{value}', String(value ?? '')) ?? effect.description
    default:
      actionDesc = effect.description
  }

  return `${actionDesc} (${sourceName})`
}

export function processEffect(
  effect: Effect,
  context: EffectContext
): EffectResult {
  const conditionsPassed = evaluateAllConditions(effect.conditions, context)

  if (!conditionsPassed) {
    return {
      effect,
      success: false,
      actions: [],
    }
  }

  const actionResults: ActionResult[] = effect.actions.map(action => {
    const value = calculateActionValue(action, context)
    const message = formatEffectMessage(effect, action, value)

    return {
      action,
      applied: true,
      value,
      message,
    }
  })

  return {
    effect,
    success: true,
    actions: actionResults,
  }
}

// Process multiple effects sorted by priority
export function processEffects(
  effects: Effect[],
  context: EffectContext
): EffectResult[] {
  const sorted = [...effects].sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100))
  return sorted.map(effect => processEffect(effect, context))
}

export function getEffectsForTrigger(
  effects: Effect[],
  trigger: EffectTrigger
): Effect[] {
  return effects.filter(e => e.trigger === trigger)
}
