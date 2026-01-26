import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/svelte'
import SwapWeaponModal from './SwapWeaponModal.svelte'
import type { OwnedWeapon, Equipment } from '$lib/models/player'

describe('SwapWeaponModal', () => {
	const mockOwnedWeapons: OwnedWeapon[] = [
		{ weaponId: 'sword', materialId: null },
		{ weaponId: 'dagger', materialId: 'steel' },
		{ weaponId: 'light-shield', materialId: null }
	]

	const mockEquipment: Equipment = {
		weapon: { id: 'sword', materialId: null },
		offhand: { id: null, materialId: null },
		armor: { id: null, materialId: null },
		accessories: []
	}

	const defaultProps = {
		isOpen: true,
		ownedWeapons: mockOwnedWeapons,
		currentEquipment: mockEquipment,
		currentAP: 5,
		onSwap: vi.fn(),
		onClose: vi.fn()
	}

	it('should display owned weapons not currently equipped', () => {
		render(SwapWeaponModal, { props: defaultProps })

		// sword is equipped, should not appear
		// dagger and light-shield should appear
		expect(screen.queryByText('Sword')).toBeFalsy()
		expect(screen.getByText('Steel Dagger')).toBeTruthy()
		expect(screen.getByText('Light Shield')).toBeTruthy()
	})

	it('should show weapon range for each option', () => {
		render(SwapWeaponModal, { props: defaultProps })

		// Should show range badges - both dagger and shield are Adjacent range
		const adjacentBadges = screen.getAllByText('Adjacent')
		expect(adjacentBadges.length).toBeGreaterThan(0)
	})

	it('should show "1 AP" cost in header', () => {
		render(SwapWeaponModal, { props: defaultProps })

		// The header has a badge with "1 AP" for the swap cost (variant-filled-warning)
		const header = document.querySelector('header')
		expect(header?.textContent).toContain('1 AP')
	})

	it('should show weapon damage for each option', () => {
		render(SwapWeaponModal, { props: defaultProps })

		// Dagger has baseDamageLethal of 1
		expect(screen.getByText('1 Dmg')).toBeTruthy()
	})

	it('should show weapon AP cost for each option', () => {
		render(SwapWeaponModal, { props: defaultProps })

		// Dagger has apCost of 1, but that will be shown as "1 AP" which may conflict
		// Light shield has apCost of 2
		expect(screen.getByText('2 AP')).toBeTruthy()
	})

	it('should call onSwap with weapon data when two-handed weapon is selected', async () => {
		const handleSwap = vi.fn()
		const propsWithTwoHanded = {
			...defaultProps,
			ownedWeapons: [
				{ weaponId: 'greatsword', materialId: null },
				{ weaponId: 'dagger', materialId: 'steel' }
			],
			onSwap: handleSwap
		}
		render(SwapWeaponModal, { props: propsWithTwoHanded })

		await fireEvent.click(screen.getByText('Greatsword').closest('button')!)
		expect(handleSwap).toHaveBeenCalledWith({
			weaponId: 'greatsword',
			materialId: null,
			slot: 'weapon'
		})
	})

	it('should disable swap when insufficient AP', () => {
		render(SwapWeaponModal, {
			props: {
				...defaultProps,
				currentAP: 0
			}
		})

		const buttons = screen.getAllByRole('button')
		const weaponButton = buttons.find((b) => b.textContent?.includes('Steel Dagger'))
		expect(weaponButton?.hasAttribute('disabled')).toBe(true)
	})

	it('should show slot selection for shields', async () => {
		render(SwapWeaponModal, { props: defaultProps })

		// Clicking shield should show slot options (main hand or offhand)
		await fireEvent.click(screen.getByText('Light Shield').closest('button')!)

		expect(screen.getByText('Main Hand')).toBeTruthy()
		expect(screen.getByText('Off Hand')).toBeTruthy()
	})

	it('should show slot selection for one-handed weapons', async () => {
		render(SwapWeaponModal, { props: defaultProps })

		// Clicking dagger should show slot options since it's one-handed
		await fireEvent.click(screen.getByText('Steel Dagger').closest('button')!)

		expect(screen.getByText('Main Hand')).toBeTruthy()
		expect(screen.getByText('Off Hand')).toBeTruthy()
	})

	it('should call onSwap with correct slot when slot is selected', async () => {
		const handleSwap = vi.fn()
		render(SwapWeaponModal, {
			props: {
				...defaultProps,
				onSwap: handleSwap
			}
		})

		// Click dagger to show slot selection
		await fireEvent.click(screen.getByText('Steel Dagger').closest('button')!)

		// Select offhand
		await fireEvent.click(screen.getByText('Off Hand'))

		expect(handleSwap).toHaveBeenCalledWith({
			weaponId: 'dagger',
			materialId: 'steel',
			slot: 'offhand'
		})
	})

	it('should filter out both weapon and offhand slots from available weapons', () => {
		const propsWithBothEquipped: typeof defaultProps = {
			...defaultProps,
			ownedWeapons: [
				{ weaponId: 'sword', materialId: null },
				{ weaponId: 'dagger', materialId: 'steel' },
				{ weaponId: 'light-shield', materialId: null }
			],
			currentEquipment: {
				weapon: { id: 'sword', materialId: null },
				offhand: { id: 'light-shield', materialId: null },
				armor: { id: null, materialId: null },
				accessories: []
			}
		}

		render(SwapWeaponModal, { props: propsWithBothEquipped })

		// sword and light-shield are equipped, only dagger should appear
		expect(screen.queryByText('Sword')).toBeFalsy()
		expect(screen.queryByText('Light Shield')).toBeFalsy()
		expect(screen.getByText('Steel Dagger')).toBeTruthy()
	})

	it('should show empty message when no weapons available', () => {
		const propsAllEquipped = {
			...defaultProps,
			ownedWeapons: [{ weaponId: 'sword', materialId: null }],
			currentEquipment: {
				weapon: { id: 'sword', materialId: null },
				offhand: { id: null, materialId: null },
				armor: { id: null, materialId: null },
				accessories: []
			}
		}

		render(SwapWeaponModal, { props: propsAllEquipped })

		expect(screen.getByText('No other weapons available')).toBeTruthy()
	})

	it('should call onClose when Cancel button is clicked', async () => {
		const handleClose = vi.fn()
		render(SwapWeaponModal, {
			props: {
				...defaultProps,
				onClose: handleClose
			}
		})

		await fireEvent.click(screen.getByText('Cancel'))
		expect(handleClose).toHaveBeenCalled()
	})

	it('should not render when isOpen is false', () => {
		render(SwapWeaponModal, {
			props: {
				...defaultProps,
				isOpen: false
			}
		})

		expect(screen.queryByText('Swap Weapon')).toBeFalsy()
	})
})
