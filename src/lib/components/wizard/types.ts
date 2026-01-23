import type { ComponentType, SvelteComponent } from 'svelte'
import type { PlayerData } from '$lib/models/player'

export interface WizardStepConfig {
	id: number
	name: string
	component: ComponentType<SvelteComponent>
	isConditional?: boolean
	showIf?: (formData: Partial<PlayerData>) => boolean
}

export interface WizardNavigationEvent {
	direction: 'next' | 'back'
	fromStep: number
	toStep: number
}
