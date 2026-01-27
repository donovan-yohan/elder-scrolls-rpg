<script lang="ts">
	import type { CombatSession } from '$lib/models/combat'

	export let session: CombatSession
	export let onEndTurn: () => void
	export let onStartTurn: () => void
</script>

<header class="combat-header card p-4 variant-soft-surface">
	<div class="flex flex-wrap items-center justify-between gap-4">
		<!-- Round Info -->
		<div class="flex items-center gap-4">
			<div class="text-center">
				<div class="text-xs uppercase tracking-wide opacity-75">Round</div>
				<div class="text-3xl font-bold text-primary-500">{session.round}</div>
			</div>

			<div class="h-12 w-px bg-surface-500/30"></div>

			<div class="text-center">
				<div class="text-xs uppercase tracking-wide opacity-75">Turn</div>
				<div class="text-lg font-semibold">
					{#if session.isPlayerTurn}
						<span class="text-success-500">Your Turn</span>
					{:else}
						<span class="text-error-500">Enemy Turn</span>
					{/if}
				</div>
			</div>
		</div>

		<!-- Turn Controls -->
		<div class="flex items-center gap-2">
			{#if session.isPlayerTurn}
				<button
					type="button"
					class="btn variant-filled-warning"
					onclick={onEndTurn}
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
					</svg>
					End Turn
				</button>
			{:else}
				<button
					type="button"
					class="btn variant-filled-success"
					onclick={onStartTurn}
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					Start Turn
				</button>
			{/if}
		</div>
	</div>
</header>
