import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/svelte'
import SpiritRecoveryModal from './SpiritRecoveryModal.svelte'

describe('SpiritRecoveryModal', () => {
	it('should render with spirit points remaining message', () => {
		const { getByText } = render(SpiritRecoveryModal, {
			props: {
				currentSpiritPoints: 2,
				maxSpiritPoints: 3,
				characterName: 'Dovahkiin',
				onspend: vi.fn(),
				onfall: vi.fn()
			}
		})

		expect(getByText(/Dovahkiin has fallen!/i)).toBeTruthy()
		expect(getByText(/2 spirit points remaining/i)).toBeTruthy()
	})

	it('should show dying message when no spirit points', () => {
		const { getByText } = render(SpiritRecoveryModal, {
			props: {
				currentSpiritPoints: 0,
				maxSpiritPoints: 2,
				characterName: 'Dovahkiin',
				onspend: vi.fn(),
				onfall: vi.fn()
			}
		})

		expect(getByText(/unconscious and dying/i)).toBeTruthy()
	})

	it('should call onspend when Rise Again clicked', async () => {
		const onspend = vi.fn()
		const { getByText } = render(SpiritRecoveryModal, {
			props: {
				currentSpiritPoints: 1,
				maxSpiritPoints: 2,
				characterName: 'Dovahkiin',
				onspend,
				onfall: vi.fn()
			}
		})

		await fireEvent.click(getByText('Rise Again'))
		expect(onspend).toHaveBeenCalled()
	})

	it('should disable Rise Again button when no spirit points', () => {
		const { getByText } = render(SpiritRecoveryModal, {
			props: {
				currentSpiritPoints: 0,
				maxSpiritPoints: 2,
				characterName: 'Dovahkiin',
				onspend: vi.fn(),
				onfall: vi.fn()
			}
		})

		const button = getByText('Rise Again')
		expect(button.hasAttribute('disabled')).toBe(true)
	})

	it('should call onfall when Fall Unconscious clicked', async () => {
		const onfall = vi.fn()
		const { getByText } = render(SpiritRecoveryModal, {
			props: {
				currentSpiritPoints: 0,
				maxSpiritPoints: 2,
				characterName: 'Dovahkiin',
				onspend: vi.fn(),
				onfall
			}
		})

		await fireEvent.click(getByText('Fall Unconscious'))
		expect(onfall).toHaveBeenCalled()
	})
})
