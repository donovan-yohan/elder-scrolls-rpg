import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/svelte'
import ActionTile from './ActionTile.svelte'

describe('ActionTile', () => {
	it('should render action name and cost', () => {
		render(ActionTile, {
			props: {
				name: 'Move',
				cost: '1-3 AP',
				icon: 'boot',
				color: 'primary',
				disabled: false,
				onclick: vi.fn()
			}
		})

		expect(screen.getByText('Move')).toBeTruthy()
		expect(screen.getByText('1-3 AP')).toBeTruthy()
	})

	it('should apply disabled styling when disabled', () => {
		render(ActionTile, {
			props: {
				name: 'Move',
				cost: '1-3 AP',
				icon: 'boot',
				color: 'primary',
				disabled: true,
				onclick: vi.fn()
			}
		})

		const button = screen.getByRole('button')
		expect(button.classList.contains('opacity-50')).toBe(true)
	})

	it('should call onclick when clicked', async () => {
		const handleClick = vi.fn()
		render(ActionTile, {
			props: {
				name: 'Move',
				cost: '1-3 AP',
				icon: 'boot',
				color: 'primary',
				disabled: false,
				onclick: handleClick
			}
		})

		await fireEvent.click(screen.getByRole('button'))
		expect(handleClick).toHaveBeenCalledOnce()
	})

	it('should still call onclick when disabled (for exploration)', async () => {
		const handleClick = vi.fn()
		render(ActionTile, {
			props: {
				name: 'Move',
				cost: '1-3 AP',
				icon: 'boot',
				color: 'primary',
				disabled: true,
				onclick: handleClick
			}
		})

		await fireEvent.click(screen.getByRole('button'))
		expect(handleClick).toHaveBeenCalledOnce()
	})

	it('should apply correct color variant class', () => {
		render(ActionTile, {
			props: {
				name: 'Attack',
				cost: '2 AP',
				icon: 'sword',
				color: 'error',
				disabled: false,
				onclick: vi.fn()
			}
		})

		const button = screen.getByRole('button')
		expect(button.classList.contains('variant-soft-error')).toBe(true)
	})
})
