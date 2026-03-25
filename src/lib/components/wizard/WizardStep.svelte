<script lang="ts">
	import { wizardStore } from '$lib/stores/wizard.store'

	interface Props {
		title: string
		description?: string
		stepIndex?: number
	}

	let { title, description = '', stepIndex = 0 }: Props = $props()

	let isValid = $derived($wizardStore.stepValidation[stepIndex] ?? false)
	let hasError = $derived($wizardStore.stepValidation[stepIndex] === false)
</script>

<div class="wizard-step flex flex-col gap-6 h-full">
	<!-- Step Header -->
	<header class="wizard-step-header">
		<h2 class="h2 font-bold">{title}</h2>
		{#if description}
			<p class="text-surface-600-300-token mt-2">{description}</p>
		{/if}
	</header>

	<!-- Validation Status -->
	{#if hasError}
		<aside class="alert variant-filled-error">
			<div class="alert-message">
				<p>Please complete all required fields before proceeding.</p>
			</div>
		</aside>
	{/if}

	<!-- Step Content -->
	<div class="wizard-step-content flex-1 overflow-y-auto">
		<slot />
	</div>

	<!-- Optional footer slot for step-specific actions -->
	{#if $$slots.footer}
		<footer class="wizard-step-footer mt-auto pt-4 border-t border-surface-500/30">
			<slot name="footer" />
		</footer>
	{/if}
</div>

<style>
	.wizard-step {
		min-height: 0;
	}

	.wizard-step-content {
		scrollbar-gutter: stable;
	}
</style>
