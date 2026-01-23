<script lang="ts">
	import type { ActiveCondition } from '$lib/models/combat'
	import { ConditionType } from '$lib/models/combat'

	export let conditions: ActiveCondition[] = []
	export let onRemove: ((condition: ActiveCondition) => void) | undefined = undefined

	function getConditionColor(type: ConditionType): string {
		switch (type) {
			case ConditionType.Stunned:
			case ConditionType.Prone:
			case ConditionType.Grappled:
				return 'variant-filled-warning'
			case ConditionType.Frightened:
				return 'variant-filled-secondary'
			case ConditionType.Poisoned:
			case ConditionType.Burning:
			case ConditionType.Bleeding:
				return 'variant-filled-error'
			case ConditionType.Frozen:
				return 'variant-filled-tertiary'
			case ConditionType.Concentrating:
				return 'variant-filled-primary'
			default:
				return 'variant-filled-surface'
		}
	}

	function formatDuration(duration: number | undefined): string {
		if (duration === undefined) return ''
		if (duration === 1) return '1 round'
		return `${duration} rounds`
	}
</script>

<div class="condition-tracker">
	{#if conditions.length === 0}
		<p class="text-surface-500 text-sm italic">No active conditions</p>
	{:else}
		<div class="flex flex-wrap gap-2">
			{#each conditions as condition}
				<span class="chip {getConditionColor(condition.type)} flex items-center gap-2">
					<span class="font-medium">{condition.type}</span>
					{#if condition.level}
						<span class="text-xs opacity-75">Lv.{condition.level}</span>
					{/if}
					{#if condition.duration !== undefined}
						<span class="text-xs opacity-75">({formatDuration(condition.duration)})</span>
					{/if}
					{#if onRemove}
						<button
							type="button"
							class="btn-icon btn-icon-sm variant-soft hover:variant-filled-error"
							on:click={() => onRemove?.(condition)}
							aria-label="Remove {condition.type} condition"
						>
							<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					{/if}
				</span>
			{/each}
		</div>
	{/if}
</div>

<style>
	.chip {
		@apply px-3 py-1 rounded-full text-sm;
	}
</style>
