<script lang="ts">
	export let onSubmit: (value: number) => void
	export let min: number = 1
	export let max: number = 20
	export let disabled: boolean = false

	let value: number = 10

	function handleSubmit() {
		if (value >= min && value <= max) {
			onSubmit(value)
		}
	}
</script>

<div class="manual-entry flex items-center gap-2">
	<input
		type="number"
		class="input w-20 text-center"
		bind:value
		{min}
		{max}
		{disabled}
	/>
	<button
		type="button"
		class="btn variant-filled-primary"
		on:click={handleSubmit}
		{disabled}
	>
		Use Roll
	</button>
</div>
