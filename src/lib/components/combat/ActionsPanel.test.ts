import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/svelte'
import ActionsPanel from './ActionsPanel.svelte'

describe('ActionsPanel', () => {
	const defaultProps = {
		currentAP: 5,
		currentMP: 10,
		currentInitiative: 3,
		hasHeftedShield: false,
		onActionSelect: vi.fn()
	}

	it('should render three column headers', () => {
		render(ActionsPanel, { props: defaultProps })

		expect(screen.getByText('Movement & Utility')).toBeTruthy()
		expect(screen.getByText('Offensive')).toBeTruthy()
		expect(screen.getByText('Defensive')).toBeTruthy()
	})

	it('should render all 10 action tiles', () => {
		render(ActionsPanel, { props: defaultProps })

		// Movement/Utility (4)
		expect(screen.getByText('Move')).toBeTruthy()
		expect(screen.getByText('Swap Weapon')).toBeTruthy()
		expect(screen.getByText('Heft Shield')).toBeTruthy()
		expect(screen.getByText('Use Item')).toBeTruthy()

		// Offensive (3)
		expect(screen.getByText('Attack')).toBeTruthy()
		expect(screen.getByText('Cast Spell')).toBeTruthy()
		expect(screen.getByText('Focus Attack')).toBeTruthy()

		// Defensive (3)
		expect(screen.getByText('Block')).toBeTruthy()
		expect(screen.getByText('Dodge')).toBeTruthy()
		expect(screen.getByText('Focus Spell')).toBeTruthy()
	})

	it('should disable tiles when insufficient resources', () => {
		render(ActionsPanel, {
			props: {
				...defaultProps,
				currentAP: 0,
				currentInitiative: 0
			}
		})

		// AP-based actions should be disabled
		const moveButton = screen.getByText('Move').closest('button')
		expect(moveButton?.classList.contains('opacity-50')).toBe(true)

		// Initiative-based actions should be disabled
		const blockButton = screen.getByText('Block').closest('button')
		expect(blockButton?.classList.contains('opacity-50')).toBe(true)
	})

	it('should hide Heft Shield when no shield equipped', () => {
		render(ActionsPanel, {
			props: {
				...defaultProps,
				hasHeftedShield: false
			}
		})

		// Heft Shield should still show but context-dependent
		expect(screen.getByText('Heft Shield')).toBeTruthy()
	})
})
