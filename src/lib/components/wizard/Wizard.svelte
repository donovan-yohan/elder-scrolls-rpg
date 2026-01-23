<script lang="ts">
	import { ProgressBar } from '@skeletonlabs/skeleton'
	import { wizardStore, wizardProgress, canProceed } from '$lib/stores/wizard.store'
	import type { WizardStepConfig } from './types'
	import { createEventDispatcher, onMount } from 'svelte'
	import { hasMagicSkills } from '$lib/util/stats.util'
	import type { PlayerData } from '$lib/models/player'

	export let steps: WizardStepConfig[] = []

	const dispatch = createEventDispatcher<{
		complete: { formData: Partial<PlayerData> }
		cancel: void
	}>()

	// Filter steps based on conditions
	$: visibleSteps = steps.filter((step) => {
		if (!step.isConditional) return true
		if (!step.showIf) return true
		return step.showIf($wizardStore.formData)
	})

	$: currentStepIndex = $wizardStore.currentStep
	$: currentStep = visibleSteps[currentStepIndex]
	$: isFirstStep = currentStepIndex === 0
	$: isLastStep = currentStepIndex === visibleSteps.length - 1

	// Calculate progress based on visible steps
	$: progress = visibleSteps.length > 0 ? Math.round(((currentStepIndex + 1) / visibleSteps.length) * 100) : 0

	// Mobile sidebar toggle
	let sidebarOpen = false

	function handleStepClick(stepIndex: number) {
		// Only allow navigating to completed steps or the next available step
		if (wizardStore.canAccessStep(stepIndex)) {
			wizardStore.setStep(stepIndex)
			sidebarOpen = false
		}
	}

	function handleNext() {
		if (!$canProceed) return

		// Complete current step
		wizardStore.completeStep(currentStepIndex)

		if (isLastStep) {
			// Dispatch complete event with form data
			dispatch('complete', { formData: $wizardStore.formData })
		} else {
			wizardStore.nextStep()
		}
	}

	function handleBack() {
		if (!isFirstStep) {
			wizardStore.previousStep()
		}
	}

	function handleCancel() {
		dispatch('cancel')
	}

	function toggleSidebar() {
		sidebarOpen = !sidebarOpen
	}

	// Check if a step is accessible
	function isStepAccessible(stepIndex: number): boolean {
		// First step is always accessible
		if (stepIndex === 0) return true
		// Current step is accessible
		if (stepIndex === currentStepIndex) return true
		// Completed steps are accessible
		if ($wizardStore.completedSteps.has(stepIndex)) return true
		// Next step is accessible if current is completed
		if (stepIndex === currentStepIndex + 1 && $wizardStore.completedSteps.has(currentStepIndex)) return true
		// Check if all previous steps are completed
		for (let i = 0; i < stepIndex; i++) {
			if (!$wizardStore.completedSteps.has(i)) return false
		}
		return true
	}

	// Get step status for styling
	function getStepStatus(stepIndex: number): 'completed' | 'current' | 'upcoming' | 'disabled' {
		if ($wizardStore.completedSteps.has(stepIndex)) return 'completed'
		if (stepIndex === currentStepIndex) return 'current'
		if (isStepAccessible(stepIndex)) return 'upcoming'
		return 'disabled'
	}
</script>

<div class="wizard-container flex flex-col lg:flex-row h-full min-h-[600px] gap-4 lg:gap-0">
	<!-- Mobile Header with Menu Toggle -->
	<div class="lg:hidden flex items-center justify-between p-4 bg-surface-800 rounded-t-lg">
		<div class="flex items-center gap-3">
			<span class="badge variant-filled-primary">{currentStepIndex + 1}/{visibleSteps.length}</span>
			<span class="font-semibold">{currentStep?.name || 'Loading...'}</span>
		</div>
		<button
			type="button"
			class="btn btn-sm variant-ghost-surface"
			on:click={toggleSidebar}
			aria-label="Toggle step menu"
		>
			<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
			</svg>
		</button>
	</div>

	<!-- Sidebar -->
	<aside
		class="wizard-sidebar
			{sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
			fixed lg:relative inset-y-0 left-0 z-40
			w-64 lg:w-72
			bg-surface-800 lg:bg-surface-900/50
			border-r border-surface-700
			transition-transform duration-300 ease-in-out
			lg:rounded-l-lg overflow-hidden
			flex flex-col"
	>
		<!-- Sidebar Header -->
		<div class="p-4 border-b border-surface-700">
			<h3 class="h4 font-bold">Character Creation</h3>
			<div class="mt-3">
				<div class="flex justify-between text-sm mb-1">
					<span>Progress</span>
					<span>{progress}%</span>
				</div>
				<ProgressBar value={progress} max={100} height="h-2" meter="bg-primary-500" track="bg-surface-700" />
			</div>
		</div>

		<!-- Step List -->
		<nav class="flex-1 overflow-y-auto p-2">
			<ol class="space-y-1">
				{#each visibleSteps as step, index}
					{@const status = getStepStatus(index)}
					<li>
						<button
							type="button"
							class="w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors
								{status === 'current' ? 'bg-primary-500/20 text-primary-400 font-semibold' : ''}
								{status === 'completed' ? 'text-success-400 hover:bg-surface-700' : ''}
								{status === 'upcoming' ? 'text-surface-300 hover:bg-surface-700' : ''}
								{status === 'disabled' ? 'text-surface-600 cursor-not-allowed' : 'cursor-pointer'}"
							on:click={() => handleStepClick(index)}
							disabled={status === 'disabled'}
						>
							<!-- Step Indicator -->
							<span
								class="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full border-2 text-sm font-bold
									{status === 'current' ? 'border-primary-500 bg-primary-500 text-white' : ''}
									{status === 'completed' ? 'border-success-500 bg-success-500 text-white' : ''}
									{status === 'upcoming' ? 'border-surface-500 text-surface-400' : ''}
									{status === 'disabled' ? 'border-surface-700 text-surface-600' : ''}"
							>
								{#if status === 'completed'}
									<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
									</svg>
								{:else}
									{index + 1}
								{/if}
							</span>

							<!-- Step Name -->
							<span class="flex-1 truncate">{step.name}</span>

							<!-- Conditional Badge -->
							{#if step.isConditional}
								<span class="badge variant-soft-warning text-xs">Conditional</span>
							{/if}
						</button>
					</li>
				{/each}
			</ol>
		</nav>

		<!-- Sidebar Footer -->
		<div class="p-4 border-t border-surface-700">
			<button
				type="button"
				class="btn variant-ghost-error w-full"
				on:click={handleCancel}
			>
				Cancel
			</button>
		</div>
	</aside>

	<!-- Mobile Sidebar Overlay -->
	{#if sidebarOpen}
		<button
			type="button"
			class="fixed inset-0 bg-black/50 z-30 lg:hidden"
			on:click={() => (sidebarOpen = false)}
			aria-label="Close sidebar"
		/>
	{/if}

	<!-- Main Content Area -->
	<main class="flex-1 flex flex-col bg-surface-900/30 lg:rounded-r-lg overflow-hidden">
		<!-- Step Content -->
		<div class="flex-1 p-6 overflow-y-auto">
			{#if currentStep}
				<svelte:component this={currentStep.component} stepIndex={currentStepIndex} />
			{:else}
				<div class="flex items-center justify-center h-full">
					<p class="text-surface-500">Loading step...</p>
				</div>
			{/if}
		</div>

		<!-- Navigation Footer -->
		<footer class="p-4 border-t border-surface-700 bg-surface-900/50">
			<div class="flex justify-between items-center">
				<!-- Back Button -->
				<button
					type="button"
					class="btn variant-ghost-surface"
					on:click={handleBack}
					disabled={isFirstStep}
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
					</svg>
					Back
				</button>

				<!-- Step Indicator (Desktop) -->
				<div class="hidden lg:flex items-center gap-2 text-sm text-surface-400">
					<span>Step {currentStepIndex + 1} of {visibleSteps.length}</span>
				</div>

				<!-- Next/Complete Button -->
				<button
					type="button"
					class="btn {isLastStep ? 'variant-filled-success' : 'variant-filled-primary'}"
					on:click={handleNext}
					disabled={!$canProceed}
				>
					{#if isLastStep}
						Complete
						<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
						</svg>
					{:else}
						Next
						<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
						</svg>
					{/if}
				</button>
			</div>
		</footer>
	</main>
</div>

<style>
	.wizard-container {
		max-height: calc(100vh - 120px);
	}
</style>
