<script lang="ts">
	import { onMount, afterUpdate } from 'svelte'
	import type { CombatLogEntry, DiceRoll } from '$lib/models/combat'

	export let log: CombatLogEntry[] = []
	export let maxHeight: string = '300px'

	let scrollContainer: HTMLDivElement
	let shouldAutoScroll = true

	afterUpdate(() => {
		if (shouldAutoScroll && scrollContainer) {
			scrollContainer.scrollTop = scrollContainer.scrollHeight
		}
	})

	function handleScroll() {
		if (!scrollContainer) return
		// Disable auto-scroll if user scrolls up
		const isAtBottom = scrollContainer.scrollHeight - scrollContainer.scrollTop <= scrollContainer.clientHeight + 50
		shouldAutoScroll = isAtBottom
	}

	function getEntryColor(type: CombatLogEntry['type']): string {
		switch (type) {
			case 'damage':
				return 'text-error-500'
			case 'healing':
				return 'text-success-500'
			case 'turn':
				return 'text-primary-500 font-semibold'
			case 'initiative':
				return 'text-warning-500'
			case 'condition':
				return 'text-secondary-500'
			case 'system':
				return 'text-surface-500 italic'
			default:
				return ''
		}
	}

	function formatTime(timestamp: string): string {
		const date = new Date(timestamp)
		return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
	}

	function formatRoll(roll: DiceRoll): string {
		const bonusStr = roll.bonuses.map(b => `${b.value >= 0 ? '+' : ''}${b.value}`).join('')
		let result = `d20(${roll.baseRoll})${bonusStr} = ${roll.total}`
		if (roll.isCritical) result += ' CRIT!'
		if (roll.isCriticalFail) result += ' FUMBLE!'
		return result
	}
</script>

<div class="combat-log card variant-soft-surface">
	<header class="card-header py-2 px-4 border-b border-surface-500/20">
		<h4 class="font-semibold text-sm">Combat Log</h4>
	</header>

	<div
		bind:this={scrollContainer}
		on:scroll={handleScroll}
		class="log-entries overflow-y-auto p-2 space-y-1"
		style="max-height: {maxHeight}"
	>
		{#if log.length === 0}
			<p class="text-surface-500 text-sm italic text-center py-4">Combat log is empty</p>
		{:else}
			{#each log as entry (entry.id)}
				<div class="log-entry text-sm py-1 px-2 rounded hover:bg-surface-500/10 {getEntryColor(entry.type)}">
					<span class="text-xs text-surface-500 mr-2">[{formatTime(entry.timestamp)}]</span>
					<span>
						{#if entry.description.includes('(')}
							{@const lastParenIndex = entry.description.lastIndexOf('(')}
							{@const mainText = entry.description.substring(0, lastParenIndex)}
							{@const sourceText = entry.description.substring(lastParenIndex)}
							{mainText}<span class="effect-source">{sourceText}</span>
						{:else}
							{entry.description}
						{/if}
					</span>
					{#if entry.roll}
						<span class="text-xs ml-2 opacity-75">({formatRoll(entry.roll)})</span>
					{/if}
					{#if entry.damage}
						<span class="text-error-500 ml-1">-{entry.damage} HP</span>
					{/if}
					{#if entry.healing}
						<span class="text-success-500 ml-1">+{entry.healing} HP</span>
					{/if}
				</div>
			{/each}
		{/if}
	</div>
</div>

<style>
	.combat-log {
		display: flex;
		flex-direction: column;
	}

	.log-entries {
		font-family: monospace;
	}

	.log-entry {
		word-break: break-word;
	}

	.effect-source {
		color: var(--color-surface-500);
		font-style: italic;
	}
</style>
