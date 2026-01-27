<script lang="ts">
	import type { PlayerData } from '$lib/models/player'
	import type { DiceRoll } from '$lib/models/combat'
	import { getSkillBonus } from '$lib/util/combat.util'
	import { Skill } from '$lib/data/skill'
	import DiceRoller from '../DiceRoller/DiceRoller.svelte'
	import RollResult from '../DiceRoller/RollResult.svelte'

	interface Props {
		isOpen: boolean
		player: PlayerData
		currentInitiative: number
		onDodge: (result: { success: boolean; damageReduction: 'full' | 'half' | 'none'; disoriented: boolean }) => void
		onClose: () => void
	}

	let { isOpen, player, currentInitiative, onDodge, onClose }: Props = $props()

	let step = $state<'setup' | 'roll' | 'result'>('setup')
	let attackRoll = $state(15) // Enemy attack roll to dodge against
	let dodgeRoll = $state<DiceRoll | undefined>(undefined)
	let useAcrobatics = $state(true) // Acrobatics (normal) vs Athletics (disadvantage)
	let partialChoice = $state<'half' | 'disoriented' | null>(null)

	let skillBonus = $derived(
		useAcrobatics
			? getSkillBonus(player, Skill.Acrobatics)
			: getSkillBonus(player, Skill.Athletics)
	)

	let dodgeSuccess = $derived.by(() => {
		if (!dodgeRoll) return false
		return dodgeRoll.total >= attackRoll
	})

	let dodgeResult = $derived.by(() => {
		if (!dodgeRoll) return { damageReduction: 'none' as const, disoriented: false, isPartial: false }
		const margin = dodgeRoll.total - attackRoll
		if (dodgeRoll.isCriticalFail) {
			return { damageReduction: 'none' as const, disoriented: true, isPartial: false }
		}
		if (margin >= 0) {
			return { damageReduction: 'full' as const, disoriented: false, isPartial: false }
		}
		if (margin >= -10) {
			// Failed by less than 10 - player chooses half damage or disoriented
			return { damageReduction: 'half' as const, disoriented: false, isPartial: true }
		}
		return { damageReduction: 'none' as const, disoriented: false, isPartial: false }
	})

	const INIT_COST = 1

	function handleProceedToRoll() {
		step = 'roll'
	}

	function handleDodgeRoll(roll: DiceRoll) {
		dodgeRoll = roll
		step = 'result'
	}

	function handleConfirm() {
		// If partial dodge, apply the player's choice
		if (dodgeResult.isPartial && partialChoice) {
			onDodge({
				success: false,
				damageReduction: partialChoice === 'half' ? 'half' : 'none',
				disoriented: partialChoice === 'disoriented'
			})
		} else {
			onDodge({
				success: dodgeSuccess,
				damageReduction: dodgeResult.damageReduction,
				disoriented: dodgeResult.disoriented
			})
		}
	}

	function resetState() {
		step = 'setup'
		attackRoll = 15
		dodgeRoll = undefined
		useAcrobatics = true
		partialChoice = null
	}

	$effect(() => {
		if (!isOpen) resetState()
	})
</script>

{#if isOpen}
	<div class="modal-backdrop fixed inset-0 bg-black/50 flex items-center justify-center z-50">
		<div class="card p-6 w-full max-w-lg bg-surface-800">
			<header class="flex justify-between items-center mb-4">
				<h2 class="h3">Dodge</h2>
				<div class="flex gap-2">
					<span class="badge variant-filled-success">Initiative: {currentInitiative}</span>
					<span class="badge variant-filled">Cost: {INIT_COST} Init</span>
				</div>
			</header>

			{#if currentInitiative < INIT_COST}
				<p class="text-error-500 mb-4">Not enough initiative to dodge.</p>
			{:else if step === 'setup'}
				<div class="space-y-4">
					<label class="label">
						<span>Enemy Attack Roll</span>
						<input type="number" class="input" bind:value={attackRoll} min="1" />
					</label>

					<div class="space-y-2">
						<span class="text-sm font-semibold">Dodge Skill</span>
						<div class="flex gap-2">
							<button
								type="button"
								class="btn flex-1"
								class:variant-filled-primary={useAcrobatics}
								class:variant-soft-surface={!useAcrobatics}
								onclick={() => useAcrobatics = true}
							>
								Acrobatics (Normal)
							</button>
							<button
								type="button"
								class="btn flex-1"
								class:variant-filled-primary={!useAcrobatics}
								class:variant-soft-surface={useAcrobatics}
								onclick={() => useAcrobatics = false}
							>
								Athletics (Disadvantage)
							</button>
						</div>
					</div>

					<button
						type="button"
						class="btn variant-filled-primary w-full"
						onclick={handleProceedToRoll}
					>
						Roll Dodge
					</button>
				</div>
			{:else if step === 'roll'}
				<div class="space-y-4">
					<div class="card variant-soft-surface p-4">
						<p class="text-sm">Dodging attack roll of <strong>{attackRoll}</strong></p>
						<p class="text-sm opacity-75">Using {useAcrobatics ? 'Acrobatics' : 'Athletics (Disadvantage)'}</p>
					</div>

					<DiceRoller
						onRoll={handleDodgeRoll}
						skillBonus={skillBonus}
						targetDC={attackRoll}
						playerLevel={player.level}
						label="Roll Dodge"
						advantageCount={useAcrobatics ? 0 : -1}
					/>
				</div>
			{:else}
				<div class="space-y-4">
					{#if dodgeRoll}
						<RollResult roll={dodgeRoll} targetDC={attackRoll} />
					{/if}

					{#if dodgeSuccess}
						<div class="card variant-soft-success p-4 text-center">
							<p class="font-bold text-success-500">Dodge Successful!</p>
							<p class="text-sm opacity-75">No damage taken. You may move up to 10 feet.</p>
						</div>
					{:else if dodgeResult.isPartial}
						<div class="card variant-soft-warning p-4 text-center">
							<p class="font-bold text-warning-500">Partial Dodge</p>
							<p class="text-sm opacity-75 mb-3">Choose one:</p>
							<div class="flex gap-2 justify-center">
								<button
									type="button"
									class="btn"
									class:variant-filled-warning={partialChoice === 'half'}
									class:variant-soft-surface={partialChoice !== 'half'}
									onclick={() => partialChoice = 'half'}
								>
									Take Half Damage
								</button>
								<button
									type="button"
									class="btn"
									class:variant-filled-warning={partialChoice === 'disoriented'}
									class:variant-soft-surface={partialChoice !== 'disoriented'}
									onclick={() => partialChoice = 'disoriented'}
								>
									Become Disoriented
								</button>
							</div>
						</div>
					{:else}
						<div class="card variant-soft-error p-4 text-center">
							<p class="font-bold text-error-500">Dodge Failed</p>
							<p class="text-sm opacity-75">
								{#if dodgeResult.disoriented}
									Full damage taken and you are disoriented.
								{:else}
									Full damage taken.
								{/if}
							</p>
						</div>
					{/if}
				</div>
			{/if}

			<footer class="flex justify-end gap-2 mt-6">
				<button type="button" class="btn variant-ghost" onclick={onClose}>Cancel</button>
				{#if step === 'result'}
					<button
						type="button"
						class="btn variant-filled-primary"
						onclick={handleConfirm}
						disabled={dodgeResult.isPartial && !partialChoice}
					>
						Apply Result
					</button>
				{/if}
			</footer>
		</div>
	</div>
{/if}
