<script lang="ts">
	import { shouts, getShoutById } from '$lib/data/shouts'

	interface Props {
		knownShouts: string[]
		onchange: (shouts: string[]) => void
	}

	let { knownShouts, onchange }: Props = $props()

	function toggleShout(shoutId: string) {
		if (knownShouts.includes(shoutId)) {
			onchange(knownShouts.filter(id => id !== shoutId))
		} else {
			onchange([...knownShouts, shoutId])
		}
	}

</script>

<div class="shout-picker space-y-4">
	<div class="text-sm text-surface-500 mb-4">
		Select the dragon shouts your character has learned. Each word costs <span class="font-semibold text-warning-400">1 AP</span> and <span class="font-semibold text-primary-400">2 MP</span> to use.
	</div>

	<div class="grid grid-cols-1 gap-4">
		{#each shouts as shout (shout.id)}
			{@const selected = knownShouts.includes(shout.id)}
			<button
				type="button"
				class="card p-4 text-left transition-all {selected ? 'ring-2 ring-tertiary-500 bg-tertiary-500/10' : 'hover:bg-surface-600/50'}"
				onclick={() => toggleShout(shout.id)}
			>
				<div class="flex items-start justify-between gap-3">
					<div class="flex-1">
						<div class="flex items-center gap-2 mb-1">
							<h4 class="font-bold text-lg">{shout.name}</h4>
							{#if selected}
								<span class="badge variant-filled-tertiary text-xs">Known</span>
							{/if}
						</div>
						<p class="text-sm text-surface-400 mb-3">{shout.description}</p>

						{#if shout.resolve}
							<p class="text-xs text-warning-400 mb-3 italic">{shout.resolve}</p>
						{/if}

						<div class="space-y-2">
							{#each shout.words as word, index}
								<div class="flex items-start gap-3 p-2 rounded bg-surface-700/50">
									<div class="flex-shrink-0 w-6 h-6 rounded-full bg-tertiary-500/30 flex items-center justify-center text-xs font-bold text-tertiary-300">
										{index + 1}
									</div>
									<div class="flex-1 min-w-0">
										<div class="flex items-center gap-2 flex-wrap">
											<span class="font-semibold text-tertiary-300">{word.word}</span>
											<span class="text-surface-500">({word.translation})</span>
											<span class="badge variant-soft-surface text-xs">{word.range}</span>
										</div>
										<p class="text-sm text-surface-400 mt-1">{word.effect}</p>
									</div>
								</div>
							{/each}
						</div>
					</div>

					<div
						class="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 {selected ? 'border-tertiary-500 bg-tertiary-500' : 'border-surface-500'}"
					>
						{#if selected}
							<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
							</svg>
						{/if}
					</div>
				</div>
			</button>
		{/each}
	</div>

	{#if knownShouts.length > 0}
		<div class="card p-3 variant-soft">
			<div class="text-sm font-semibold mb-2">Selected Shouts ({knownShouts.length})</div>
			<div class="flex flex-wrap gap-2">
				{#each knownShouts as shoutId}
					{@const shout = getShoutById(shoutId)}
					{#if shout}
						<span class="badge variant-filled-tertiary">{shout.name}</span>
					{/if}
				{/each}
			</div>
		</div>
	{/if}
</div>
