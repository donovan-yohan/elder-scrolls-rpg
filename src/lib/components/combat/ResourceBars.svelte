<script lang="ts">
	import { ProgressBar } from '@skeletonlabs/skeleton'
	import type { CombatSession } from '$lib/models/combat'

	export let session: CombatSession
	export let maxHP: number
	export let maxMP: number
	export let onAdjustHP: (delta: number) => void
	export let onAdjustMP: (delta: number) => void
	export let onAdjustAP: (delta: number) => void

	$: hpPercent = maxHP > 0 ? (session.currentHP / maxHP) * 100 : 0
	$: mpPercent = maxMP > 0 ? (session.currentMP / maxMP) * 100 : 0
	$: apPercent = session.maxAP > 0 ? (session.currentAP / session.maxAP) * 100 : 0

	function getHPColor(percent: number): string {
		if (percent > 50) return 'bg-success-500'
		if (percent > 25) return 'bg-warning-500'
		return 'bg-error-500'
	}
</script>

<div class="resource-bars grid grid-cols-3 gap-4">
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
				on:click={() => onAdjustHP(-1)}
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
				on:click={() => onAdjustHP(1)}
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
				on:click={() => onAdjustMP(-1)}
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
				on:click={() => onAdjustMP(1)}
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
				on:click={() => onAdjustAP(-1)}
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
				on:click={() => onAdjustAP(1)}
				disabled={session.currentAP >= session.maxAP}
			>
				+
			</button>
		</div>
	</div>
</div>
