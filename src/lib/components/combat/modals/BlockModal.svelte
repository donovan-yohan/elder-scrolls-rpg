<script lang="ts">
	import type { PlayerData } from '$lib/models/player'
	import type { DiceRoll } from '$lib/models/combat'
	import type { MagickaBurstCost } from '$lib/util/magickaBurst.util'
	import { getWeaponById, getShieldBlockAdvantage, type WeaponType } from '$lib/data/weapons'
	import { calculateSkillBonus } from '$lib/util/stats.util'
	import { Skill } from '$lib/data/skill'
	import DiceRoller from '../DiceRoller/DiceRoller.svelte'
	import RollResult from '../DiceRoller/RollResult.svelte'

	interface Props {
		isOpen: boolean
		player: PlayerData
		shieldId: string | null
		currentInitiative: number
		currentMP: number
		currentHP: number
		hasHeftedShield: boolean
		onBlock: (result: { success: boolean; damageReduction: 'full' | 'half' | 'minimal' | 'none' }) => void
		onClose: () => void
		onMagickaBurst?: (cost: MagickaBurstCost, acceptedMisfortune: boolean) => void
	}

	let { isOpen, player, shieldId, currentInitiative, currentMP, currentHP, hasHeftedShield, onBlock, onClose, onMagickaBurst }: Props = $props()

	let shield = $derived(shieldId ? getWeaponById(shieldId) : null)
	let shieldAdvantage = $derived(shield ? getShieldBlockAdvantage(shield.type as WeaponType) : 0)
	let skillBonus = $derived(calculateSkillBonus(player, Skill.Blocking))

	let step = $state<'setup' | 'roll' | 'result'>('setup')
	let attackRoll = $state(15)
	let blockRoll = $state<DiceRoll | undefined>(undefined)

	let blockSuccess = $derived.by(() => {
		if (!blockRoll) return false
		return blockRoll.total >= attackRoll
	})

	let blockResult = $derived.by(() => {
		if (!blockRoll) return { damageReduction: 'none' as const, initiativeChange: 0 }
		const margin = blockRoll.total - attackRoll

		// Critical fail = none (full damage) + party loses 1 initiative
		if (blockRoll.isCriticalFail) {
			return { damageReduction: 'none' as const, initiativeChange: -1 }
		}
		// Critical success = full (no damage) + enemy loses 1 initiative
		if (blockRoll.isCritical) {
			return { damageReduction: 'full' as const, initiativeChange: 1 }
		}
		// Beat by 10+ = full (no damage) + regain 1 initiative
		if (margin >= 10) {
			return { damageReduction: 'full' as const, initiativeChange: 1 }
		}
		// Beat = minimal (1 damage only)
		if (margin >= 0) {
			return { damageReduction: 'minimal' as const, initiativeChange: 0 }
		}
		// Fail by <10 = half damage
		if (margin >= -10) {
			return { damageReduction: 'half' as const, initiativeChange: 0 }
		}
		// Fail by 10+ = none (full damage)
		return { damageReduction: 'none' as const, initiativeChange: 0 }
	})

	const INIT_COST = 1

	function handleProceedToRoll() {
		step = 'roll'
	}

	function handleBlockRoll(roll: DiceRoll) {
		blockRoll = roll
		step = 'result'
	}

	function handleMagickaBurst(cost: MagickaBurstCost, previousRollWasCritFail: boolean) {
		if (onMagickaBurst) {
			onMagickaBurst(cost, previousRollWasCritFail)
		}
	}

	function handleConfirm() {
		onBlock({
			success: blockSuccess,
			damageReduction: blockResult.damageReduction
		})
	}

	function resetState() {
		step = 'setup'
		attackRoll = 15
		blockRoll = undefined
	}

	$effect(() => {
		if (!isOpen) resetState()
	})
</script>

{#if isOpen}
	<div class="modal-backdrop fixed inset-0 bg-black/50 flex items-center justify-center z-50">
		<div class="card p-6 w-full max-w-lg bg-surface-800">
			<header class="flex justify-between items-center mb-4">
				<h2 class="h3">Block</h2>
				<div class="flex gap-2">
					<span class="badge variant-filled-success">Initiative: {currentInitiative}</span>
					<span class="badge variant-filled">Cost: {INIT_COST} Init</span>
				</div>
			</header>

			{#if currentInitiative < INIT_COST}
				<p class="text-error-500 mb-4">Not enough initiative to block.</p>
			{:else if !hasHeftedShield}
				<p class="text-error-500 mb-4">Shield not hefted. Use Heft Shield first.</p>
			{:else if step === 'setup'}
				<div class="space-y-4">
					{#if shield}
						<div class="card variant-soft-surface p-4">
							<p class="font-semibold">{shield.name}</p>
							<p class="text-sm opacity-75">Block Advantage: +{shieldAdvantage}</p>
						</div>
					{/if}

					<label class="label">
						<span>Enemy Attack Roll</span>
						<input type="number" class="input" bind:value={attackRoll} min="1" />
					</label>

					<button
						type="button"
						class="btn variant-filled-primary w-full"
						onclick={handleProceedToRoll}
					>
						Roll Block
					</button>
				</div>
			{:else if step === 'roll'}
				<div class="space-y-4">
					<div class="card variant-soft-surface p-4">
						<p class="text-sm">Blocking attack roll of <strong>{attackRoll}</strong></p>
						{#if shield}
							<p class="text-sm opacity-75">Shield bonus: +{shieldAdvantage} advantage</p>
						{/if}
					</div>

					<DiceRoller
						onRoll={handleBlockRoll}
						skillBonus={skillBonus}
						targetDC={attackRoll}
						playerLevel={player.level}
						label="Roll Block"
						advantageCount={shieldAdvantage}
						showMagickaBurst={true}
						{currentMP}
						{currentHP}
						onMagickaBurst={handleMagickaBurst}
					/>
				</div>
			{:else}
				<div class="space-y-4">
					{#if blockRoll}
						<RollResult roll={blockRoll} targetDC={attackRoll} />
					{/if}

					{#if blockResult.damageReduction === 'full'}
						<div class="card variant-soft-success p-4 text-center">
							<p class="font-bold text-success-500">Perfect Block!</p>
							<p class="text-sm opacity-75">
								No damage taken.
								{#if blockRoll?.isCritical}
									Critical! Enemy loses 1 initiative.
								{:else if blockResult.initiativeChange > 0}
									Regain 1 initiative.
								{/if}
							</p>
						</div>
					{:else if blockResult.damageReduction === 'minimal'}
						<div class="card variant-soft-success p-4 text-center">
							<p class="font-bold text-success-500">Block Successful!</p>
							<p class="text-sm opacity-75">Only 1 damage taken.</p>
						</div>
					{:else if blockResult.damageReduction === 'half'}
						<div class="card variant-soft-warning p-4 text-center">
							<p class="font-bold text-warning-500">Partial Block</p>
							<p class="text-sm opacity-75">Half damage taken.</p>
						</div>
					{:else}
						<div class="card variant-soft-error p-4 text-center">
							<p class="font-bold text-error-500">Block Failed</p>
							<p class="text-sm opacity-75">
								Full damage taken.
								{#if blockRoll?.isCriticalFail}
									Critical fail! Party loses 1 initiative.
								{/if}
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
