<script lang="ts">
	import { ProgressBar } from '@skeletonlabs/skeleton'
	import type { CombatSession } from '$lib/models/combat'

	interface Props {
		session: CombatSession
		maxHP: number
		maxMP: number
		onAdjustHP: (delta: number) => void
		onAdjustMP: (delta: number) => void
		onAdjustAP: (delta: number) => void
		onAdjustSP?: (delta: number) => void
	}

	let { session, maxHP, maxMP, onAdjustHP, onAdjustMP, onAdjustAP, onAdjustSP }: Props = $props()

	let hpPercent = $derived(maxHP > 0 ? (session.currentHP / maxHP) * 100 : 0)
	let mpPercent = $derived(maxMP > 0 ? (session.currentMP / maxMP) * 100 : 0)
	let apPercent = $derived(session.maxAP > 0 ? (session.currentAP / session.maxAP) * 100 : 0)
	let spPercent = $derived(session.maxSpiritPoints > 0 ? (session.currentSpiritPoints / session.maxSpiritPoints) * 100 : 0)

	function getHPColor(percent: number): string {
		if (percent > 50) return 'bg-success-500'
		if (percent > 25) return 'bg-warning-500'
		return 'bg-error-500'
	}
</script>

<div class="resource-bars grid grid-cols-4 gap-4">
	<!-- HP Bar -->
	<div class="resource-row">
		<div class="flex items-center justify-between mb-1">
			<span class="font-semibold text-error-500">HP</span>
			<span class="text-sm font-mono">{session.currentHP} / {maxHP}</span>
		</div>
		<div class="flex items-center gap-2">
			<button
				type="button"
				class="btn btn-sm variant-ghost-error"
				onclick={() => onAdjustHP(-1)}
				disabled={session.currentHP <= 0}
			>
				-
			</button>
			<div class="flex-1">
				<ProgressBar value={hpPercent} max={100} meter={getHPColor(hpPercent)} track="bg-surface-300 dark:bg-surface-600" />
			</div>
			<button
				type="button"
				class="btn btn-sm variant-ghost-success"
				onclick={() => onAdjustHP(1)}
				disabled={session.currentHP >= maxHP}
			>
				+
			</button>
		</div>
	</div>

	<!-- MP Bar -->
	<div class="resource-row">
		<div class="flex items-center justify-between mb-1">
			<span class="font-semibold text-tertiary-500">MP</span>
			<span class="text-sm font-mono">{session.currentMP} / {maxMP}</span>
		</div>
		<div class="flex items-center gap-2">
			<button
				type="button"
				class="btn btn-sm variant-ghost-error"
				onclick={() => onAdjustMP(-1)}
				disabled={session.currentMP <= 0}
			>
				-
			</button>
			<div class="flex-1">
				<ProgressBar value={mpPercent} max={100} meter="bg-tertiary-500" track="bg-surface-300 dark:bg-surface-600" />
			</div>
			<button
				type="button"
				class="btn btn-sm variant-ghost-success"
				onclick={() => onAdjustMP(1)}
				disabled={session.currentMP >= maxMP}
			>
				+
			</button>
		</div>
	</div>

	<!-- AP Bar -->
	<div class="resource-row">
		<div class="flex items-center justify-between mb-1">
			<span class="font-semibold text-warning-500">AP</span>
			<span class="text-sm font-mono">{session.currentAP} / {session.maxAP}</span>
		</div>
		<div class="flex items-center gap-2">
			<button
				type="button"
				class="btn btn-sm variant-ghost-error"
				onclick={() => onAdjustAP(-1)}
				disabled={session.currentAP <= 0}
			>
				-
			</button>
			<div class="flex-1">
				<ProgressBar value={apPercent} max={100} meter="bg-warning-500" track="bg-surface-300 dark:bg-surface-600" />
			</div>
			<button
				type="button"
				class="btn btn-sm variant-ghost-success"
				onclick={() => onAdjustAP(1)}
				disabled={session.currentAP >= session.maxAP}
			>
				+
			</button>
		</div>
	</div>

	<!-- Spirit Points Bar -->
	<div class="resource-row">
		<div class="flex items-center justify-between mb-1">
			<span class="font-semibold text-primary-500">SP</span>
			<span class="text-sm font-mono">{session.currentSpiritPoints} / {session.maxSpiritPoints}</span>
		</div>
		<div class="flex items-center gap-2">
			{#if onAdjustSP}
				<button
					type="button"
					class="btn btn-sm variant-ghost-error"
					onclick={() => onAdjustSP?.(-1)}
					disabled={session.currentSpiritPoints <= 0}
				>
					-
				</button>
			{/if}
			<div class="flex-1">
				<ProgressBar
					value={spPercent}
					max={100}
					meter="bg-primary-500"
					track="bg-surface-300 dark:bg-surface-600"
				/>
			</div>
			{#if onAdjustSP}
				<button
					type="button"
					class="btn btn-sm variant-ghost-success"
					onclick={() => onAdjustSP?.(1)}
					disabled={session.currentSpiritPoints >= session.maxSpiritPoints}
				>
					+
				</button>
			{/if}
		</div>
	</div>
</div>
