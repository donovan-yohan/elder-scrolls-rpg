import { writable, derived, get } from 'svelte/store'
import { browser } from '$app/environment'
import type { PlayerData } from '$lib/models/player'
import { defaultPlayerData } from '$lib/models/player'

export interface WizardState {
	currentStep: number
	completedSteps: Set<number>
	formData: Partial<PlayerData>
	stepValidation: Record<number, boolean>
}

const WIZARD_STORAGE_KEY = 'wizard-state'

function createInitialState(): WizardState {
	return {
		currentStep: 0,
		completedSteps: new Set<number>(),
		formData: { ...defaultPlayerData },
		stepValidation: {},
	}
}

function loadFromStorage(): WizardState | null {
	if (!browser) return null

	const stored = localStorage.getItem(WIZARD_STORAGE_KEY)
	if (!stored) return null

	try {
		const parsed = JSON.parse(stored)
		return {
			...parsed,
			completedSteps: new Set(parsed.completedSteps || []),
		}
	} catch {
		return null
	}
}

function saveToStorage(state: WizardState): void {
	if (!browser) return

	const serializable = {
		...state,
		completedSteps: Array.from(state.completedSteps),
	}
	localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(serializable))
}

function createWizardStore() {
	const initialState = loadFromStorage() || createInitialState()
	const { subscribe, set, update } = writable<WizardState>(initialState)

	// Subscribe to persist changes
	subscribe((state) => {
		saveToStorage(state)
	})

	return {
		subscribe,

		/**
		 * Reset wizard to initial state
		 */
		initializeWizard: (): void => {
			const freshState = createInitialState()
			set(freshState)
			if (browser) {
				localStorage.removeItem(WIZARD_STORAGE_KEY)
			}
		},

		/**
		 * Navigate to a specific step
		 */
		setStep: (step: number): void => {
			update((state) => ({
				...state,
				currentStep: step,
			}))
		},

		/**
		 * Mark a step as complete
		 */
		completeStep: (step: number): void => {
			update((state) => {
				const newCompletedSteps = new Set(state.completedSteps)
				newCompletedSteps.add(step)
				return {
					...state,
					completedSteps: newCompletedSteps,
				}
			})
		},

		/**
		 * Mark a step as incomplete
		 */
		uncompleteStep: (step: number): void => {
			update((state) => {
				const newCompletedSteps = new Set(state.completedSteps)
				newCompletedSteps.delete(step)
				return {
					...state,
					completedSteps: newCompletedSteps,
				}
			})
		},

		/**
		 * Update form data (partial update)
		 */
		updateFormData: (data: Partial<PlayerData>): void => {
			update((state) => ({
				...state,
				formData: {
					...state.formData,
					...data,
				},
			}))
		},

		/**
		 * Set validation state for a step
		 */
		setStepValid: (step: number, valid: boolean): void => {
			update((state) => ({
				...state,
				stepValidation: {
					...state.stepValidation,
					[step]: valid,
				},
			}))
		},

		/**
		 * Go to next step
		 */
		nextStep: (): void => {
			update((state) => ({
				...state,
				currentStep: state.currentStep + 1,
			}))
		},

		/**
		 * Go to previous step
		 */
		previousStep: (): void => {
			update((state) => ({
				...state,
				currentStep: Math.max(0, state.currentStep - 1),
			}))
		},

		/**
		 * Get the current form data
		 */
		getFormData: (): Partial<PlayerData> => {
			return get({ subscribe }).formData
		},

		/**
		 * Check if we can proceed to the next step
		 * (current step must be valid)
		 */
		canProceed: (): boolean => {
			const state = get({ subscribe })
			return state.stepValidation[state.currentStep] === true
		},

		/**
		 * Check if a specific step is accessible
		 * (all previous steps must be completed)
		 */
		canAccessStep: (step: number): boolean => {
			const state = get({ subscribe })
			// Can always access current step or earlier completed steps
			if (step <= state.currentStep) return true
			// Can access next step if current is complete
			if (step === state.currentStep + 1 && state.completedSteps.has(state.currentStep)) return true
			// Otherwise, check if all previous steps are completed
			for (let i = 0; i < step; i++) {
				if (!state.completedSteps.has(i)) return false
			}
			return true
		},
	}
}

export const wizardStore = createWizardStore()

/**
 * Derived store for wizard progress percentage
 */
export const wizardProgress = derived(wizardStore, ($wizard) => {
	const totalSteps = Object.keys($wizard.stepValidation).length || 6
	const completedCount = $wizard.completedSteps.size
	return Math.round((completedCount / totalSteps) * 100)
})

/**
 * Derived store for checking if current step can proceed
 */
export const canProceed = derived(wizardStore, ($wizard) => {
	return $wizard.stepValidation[$wizard.currentStep] === true
})

/**
 * Derived store for current form data
 */
export const formData = derived(wizardStore, ($wizard) => $wizard.formData)
