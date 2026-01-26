import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/svelte'
import MoveModal from './MoveModal.svelte'

describe('MoveModal', () => {
	const defaultProps = {
		isOpen: true,
		currentAP: 5,
		onMove: vi.fn(),
		onClose: vi.fn()
	}

	it('should display all movement options with AP costs', () => {
		render(MoveModal, { props: defaultProps })

		expect(screen.getByText('Immediate ↔ Adjacent')).toBeTruthy()
		expect(screen.getByText('Adjacent ↔ Close')).toBeTruthy()
		expect(screen.getByText('Close ↔ Short')).toBeTruthy()
		expect(screen.getByText('Short ↔ Medium')).toBeTruthy()
		expect(screen.getByText('Medium ↔ Long')).toBeTruthy()
		expect(screen.getByText('Long ↔ Extreme')).toBeTruthy()
	})

	it('should show correct AP costs for each movement', () => {
		render(MoveModal, { props: defaultProps })

		// 1 AP movements
		const oneApButtons = screen.getAllByText('1 AP')
		expect(oneApButtons.length).toBe(3)

		// 2 AP movements
		const twoApButtons = screen.getAllByText('2 AP')
		expect(twoApButtons.length).toBe(2)

		// 3 AP movements
		const threeApButtons = screen.getAllByText('3 AP')
		expect(threeApButtons.length).toBe(1)
	})

	it('should disable movements that cost more than current AP', () => {
		render(MoveModal, {
			props: {
				...defaultProps,
				currentAP: 1
			}
		})

		// 2 AP and 3 AP movements should be disabled
		const shortMediumRow = screen.getByText('Short ↔ Medium').closest('button')
		expect(shortMediumRow?.hasAttribute('disabled')).toBe(true)
	})

	it('should call onMove with AP cost when movement selected', async () => {
		const handleMove = vi.fn()
		render(MoveModal, {
			props: {
				...defaultProps,
				onMove: handleMove
			}
		})

		await fireEvent.click(screen.getByText('Immediate ↔ Adjacent').closest('button')!)
		expect(handleMove).toHaveBeenCalledWith(1)
	})

	it('should display weapon range reference table', async () => {
		render(MoveModal, { props: defaultProps })

		// The range reference section is collapsible, toggle button should be visible
		const toggleButton = screen.getByText('Show Weapon Ranges')
		expect(toggleButton).toBeTruthy()

		// Click to expand the table
		await fireEvent.click(toggleButton)

		// Now the table headers should be visible
		expect(screen.getByText('Melee')).toBeTruthy()
		expect(screen.getByText('Ranged')).toBeTruthy()
	})
})
