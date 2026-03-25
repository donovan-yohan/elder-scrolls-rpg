<script lang="ts">
	interface Props {
		onconfirm?: () => void
		oncancel?: () => void
	}

	let { onconfirm, oncancel }: Props = $props()
</script>

<div class="card p-6 w-full max-w-md">
	<header class="mb-4">
		<h3 class="h3 font-bold">End Combat?</h3>
	</header>

	<p class="text-surface-600-300-token mb-6">
		Are you sure you want to end combat? This will clear the combat session and all combat log
		history.
	</p>

	<footer class="flex justify-end gap-2">
		<button type="button" class="btn variant-ghost" onclick={oncancel}>Cancel</button>
		<button type="button" class="btn variant-filled-error" onclick={onconfirm}
			>End Combat</button
		>
	</footer>
</div>
