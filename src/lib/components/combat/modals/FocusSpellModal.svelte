<script lang="ts">
	import type { PlayerData } from '$lib/models/player'
	import type { DiceRoll } from '$lib/models/combat'
	import type { MagickaBurstCost } from '$lib/util/magicka-burst.util'
	import { getSkillBonus } from '$lib/util/combat.util'
	import { Skill } from '$lib/data/skill'
	import DiceRoller from '../DiceRoller/DiceRoller.svelte'
	import RollResult from '../DiceRoller/RollResult.svelte'

	interface Props {
		isOpen: boolean
		player: PlayerData
		currentAP: number
		currentMP: number
		currentHP: number
		onFocus: (result: { success: boolean; extraMPCost: number }) => void
		onClose: () => void
		onMagickaBurst?: (cost: MagickaBurstCost, acceptedMisfortune: boolean) => void
	}

	let { isOpen, player, currentAP, currentMP, currentHP, onFocus, onClose, onMagickaBurst }: Props = $props()

	// Spell tier affects extra MP cost
	const spellTiers = [
		{ name: 'Novice', extraMP: 1, dc: 12 },
		{ name: 'Apprentice', extraMP: 2, dc: 14 },
		{ name: 'Adept', extraMP: 3, dc: 16 },
		{ name: 'Expert', extraMP: 5, dc: 18 },
		{ name: 'Master', extraMP: 10, dc: 20 }
	]

	let selectedTier = $state(0)
	let step = $state<'select' | 'roll' | 'result'>('select')
	let focusRoll = $state<DiceRoll | undefined>(undefined)
	let focusSuccess = $state(false)

	let currentTier = $derived(spellTiers[selectedTier])
	let skillBonus = $derived(getSkillBonus(player, Skill.Conjuration)) // Default magic skill
	let canAfford = $derived(currentAP >= 1 && currentMP >= currentTier.extraMP)

	const AP_COST = 1

	function handleProceedToRoll() {
		if (canAfford) {
			step = 'roll'
		}
	}

	function handleFocusRoll(roll: DiceRoll, success: boolean) {
		focusRoll = roll
		focusSuccess = success
		step = 'result'
	}

	function handleMagickaBurst(cost: MagickaBurstCost, previousRollWasCritFail: boolean) {
		if (onMagickaBurst) {
			onMagickaBurst(cost, previousRollWasCritFail)
		}
	}

	function handleConfirm() {
		onFocus({
			success: focusSuccess,
			extraMPCost: focusSuccess ? currentTier.extraMP : 0
		})
	}

	function resetState() {
		selectedTier = 0
		step = 'select'
		focusRoll = undefined
		focusSuccess = false
	}

	$effect(() => {
		if (!isOpen) resetState()
	})
</script>

{#if isOpen}
	<div class="modal-backdrop fixed inset-0 bg-black/50 flex items-center justify-center z-50">
		<div class="card p-6 w-full max-w-lg bg-surface-800">
			<header class="flex justify-between items-center mb-4">
				<h2 class="h3">Focus Spell</h2>
				<div class="flex gap-2">
					<span class="badge variant-filled-warning">AP: {currentAP}</span>
					<span class="badge variant-filled-tertiary">MP: {currentMP}</span>
				</div>
			</header>

			{#if step === 'select'}
				<div class="space-y-4">
					<p class="text-sm opacity-75">Select the tier of spell you want to empower. Higher tiers cost more MP but provide greater bonuses.</p>

					<div class="flex flex-col gap-2">
						{#each spellTiers as tier, i}
							{@const affordable = currentMP >= tier.extraMP && currentAP >= 1}
							<button
								type="button"
								class="btn w-full justify-between"
								class:variant-filled-primary={selectedTier === i}
								class:variant-soft-surface={selectedTier !== i}
								class:opacity-50={!affordable}
								disabled={!affordable}
								onclick={() => selectedTier = i}
							>
								<span>{tier.name}</span>
								<div class="flex gap-2">
									<span class="badge variant-filled">DC {tier.dc}</span>
									<span class="badge variant-filled-tertiary">+{tier.extraMP} MP</span>
								</div>
							</button>
						{/each}
					</div>

					<button
						type="button"
						class="btn variant-filled-primary w-full mt-4"
						class:opacity-50={!canAfford}
						disabled={!canAfford}
						onclick={handleProceedToRoll}
					>
						Proceed to Focus Check
					</button>
				</div>
			{:else if step === 'roll'}
				<div class="space-y-4">
					<div class="card variant-soft-surface p-4">
						<p class="text-sm">Focusing {currentTier.name} spell</p>
						<p class="text-sm opacity-75">Cost: 1 AP + {currentTier.extraMP} MP on success</p>
					</div>

					<DiceRoller
						onRoll={handleFocusRoll}
						skillBonus={skillBonus}
						targetDC={currentTier.dc}
						playerLevel={player.level}
						label="Roll Focus Check"
						showMagickaBurst={true}
						{currentMP}
						{currentHP}
						onMagickaBurst={handleMagickaBurst}
					/>
				</div>
			{:else}
				<div class="space-y-4">
					{#if focusRoll}
						<RollResult roll={focusRoll} targetDC={currentTier.dc} />
					{/if}

					{#if focusSuccess}
						<div class="card variant-soft-success p-4 text-center">
							<p class="font-bold text-success-500">Spell Focused!</p>
							<p class="text-sm opacity-75">
								{#if focusRoll?.isCritical}
									Critical! Retroactively increase spell DC by {Math.floor(player.level / 2)} (half your level).
								{:else}
									Your next spell gains advantage and enhanced effects.
								{/if}
								Extra cost: {currentTier.extraMP} MP
							</p>
						</div>
					{:else}
						<div class="card variant-soft-error p-4 text-center">
							<p class="font-bold text-error-500">Focus Failed</p>
							<p class="text-sm opacity-75">
								You become unfocused. Disadvantage on spell checks until you spend 1 AP + 1 MP to refocus.
							</p>
						</div>
					{/if}
				</div>
			{/if}

			<footer class="flex justify-end gap-2 mt-6">
				<button type="button" class="btn variant-ghost" onclick={onClose}>Cancel</button>
				{#if step === 'result'}
					<button type="button" class="btn variant-filled-primary" onclick={handleConfirm}>
						Apply Result
					</button>
				{/if}
			</footer>
		</div>
	</div>
{/if}
