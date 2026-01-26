import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/svelte'
import QuickEquipPanel from './QuickEquipPanel.svelte'
import type { Equipment, OwnedWeapon } from '$lib/models/player'

describe('QuickEquipPanel', () => {
	const mockEquipment: Equipment = {
		weapon: { id: 'sword', materialId: null },
		offhand: { id: null, materialId: null },
		armor: { id: null, materialId: null },
		accessories: []
	}

	const mockOwnedWeapons: OwnedWeapon[] = [
		{ weaponId: 'sword', materialId: null },
		{ weaponId: 'dagger', materialId: 'steel' }
	]

	const defaultProps = {
		equipment: mockEquipment,
		ownedWeapons: mockOwnedWeapons,
		onEquipmentChange: vi.fn()
	}

	it('should display currently equipped weapon', () => {
		render(QuickEquipPanel, { props: defaultProps })

		expect(screen.getByText('Sword')).toBeTruthy()
		expect(screen.getByText('Equipped')).toBeTruthy()
	})

	it('should show unequipped owned weapons', () => {
		render(QuickEquipPanel, { props: defaultProps })

		expect(screen.getByText('Steel Dagger')).toBeTruthy()
	})

	it('should allow equipping a different weapon', async () => {
		const handleChange = vi.fn()
		render(QuickEquipPanel, {
			props: {
				...defaultProps,
				onEquipmentChange: handleChange
			}
		})

		await fireEvent.click(screen.getByText('Steel Dagger').closest('button')!)

		expect(handleChange).toHaveBeenCalled()
		const newEquipment = handleChange.mock.calls[0][0]
		expect(newEquipment.weapon.id).toBe('dagger')
	})

	it('should allow unequipping current weapon', async () => {
		const handleChange = vi.fn()
		render(QuickEquipPanel, {
			props: {
				...defaultProps,
				onEquipmentChange: handleChange
			}
		})

		await fireEvent.click(screen.getByText('Unequip'))

		expect(handleChange).toHaveBeenCalled()
		const newEquipment = handleChange.mock.calls[0][0]
		expect(newEquipment.weapon.id).toBeNull()
	})

	it('should handle two-handed weapons by clearing offhand', async () => {
		const handleChange = vi.fn()
		const propsWithGreatsword: typeof defaultProps = {
			equipment: {
				weapon: { id: 'sword', materialId: null },
				offhand: { id: 'light-shield', materialId: null },
				armor: { id: null, materialId: null },
				accessories: []
			},
			ownedWeapons: [
				{ weaponId: 'sword', materialId: null },
				{ weaponId: 'light-shield', materialId: null },
				{ weaponId: 'greatsword', materialId: null }
			],
			onEquipmentChange: handleChange
		}
		render(QuickEquipPanel, { props: propsWithGreatsword })

		await fireEvent.click(screen.getByText('Greatsword').closest('button')!)

		expect(handleChange).toHaveBeenCalled()
		const newEquipment = handleChange.mock.calls[0][0]
		expect(newEquipment.weapon.id).toBe('greatsword')
		expect(newEquipment.offhand.id).toBeNull()
	})

	it('should equip shields to offhand', async () => {
		const handleChange = vi.fn()
		const propsWithShield: typeof defaultProps = {
			equipment: {
				weapon: { id: 'sword', materialId: null },
				offhand: { id: null, materialId: null },
				armor: { id: null, materialId: null },
				accessories: []
			},
			ownedWeapons: [
				{ weaponId: 'sword', materialId: null },
				{ weaponId: 'light-shield', materialId: null }
			],
			onEquipmentChange: handleChange
		}
		render(QuickEquipPanel, { props: propsWithShield })

		await fireEvent.click(screen.getByText('Light Shield').closest('button')!)

		expect(handleChange).toHaveBeenCalled()
		const newEquipment = handleChange.mock.calls[0][0]
		expect(newEquipment.offhand.id).toBe('light-shield')
	})

	it('should display offhand weapon when equipped', () => {
		const propsWithOffhand: typeof defaultProps = {
			equipment: {
				weapon: { id: 'sword', materialId: null },
				offhand: { id: 'light-shield', materialId: null },
				armor: { id: null, materialId: null },
				accessories: []
			},
			ownedWeapons: [
				{ weaponId: 'sword', materialId: null },
				{ weaponId: 'light-shield', materialId: null }
			],
			onEquipmentChange: vi.fn()
		}
		render(QuickEquipPanel, { props: propsWithOffhand })

		expect(screen.getByText('Light Shield')).toBeTruthy()
		expect(screen.getByText('Off Hand')).toBeTruthy()
	})

	it('should allow unequipping offhand weapon', async () => {
		const handleChange = vi.fn()
		const propsWithOffhand: typeof defaultProps = {
			equipment: {
				weapon: { id: 'sword', materialId: null },
				offhand: { id: 'light-shield', materialId: null },
				armor: { id: null, materialId: null },
				accessories: []
			},
			ownedWeapons: [
				{ weaponId: 'sword', materialId: null },
				{ weaponId: 'light-shield', materialId: null }
			],
			onEquipmentChange: handleChange
		}
		render(QuickEquipPanel, { props: propsWithOffhand })

		// There are two Unequip buttons, find the one for offhand
		const unequipButtons = screen.getAllByText('Unequip')
		// The second unequip button should be for the offhand
		await fireEvent.click(unequipButtons[1])

		expect(handleChange).toHaveBeenCalled()
		const newEquipment = handleChange.mock.calls[0][0]
		expect(newEquipment.offhand.id).toBeNull()
	})

	it('should show empty state for main hand when no weapon equipped', () => {
		const propsNoWeapon: typeof defaultProps = {
			equipment: {
				weapon: { id: null, materialId: null },
				offhand: { id: null, materialId: null },
				armor: { id: null, materialId: null },
				accessories: []
			},
			ownedWeapons: [{ weaponId: 'sword', materialId: null }],
			onEquipmentChange: vi.fn()
		}
		render(QuickEquipPanel, { props: propsNoWeapon })

		expect(screen.getByText('No main hand weapon')).toBeTruthy()
	})

	it('should display weapon damage and range stats for unequipped weapons', () => {
		render(QuickEquipPanel, { props: defaultProps })

		// Dagger has 1 damage and Adjacent range
		expect(screen.getByText('1 Dmg')).toBeTruthy()
		expect(screen.getByText('Adjacent')).toBeTruthy()
	})
})
