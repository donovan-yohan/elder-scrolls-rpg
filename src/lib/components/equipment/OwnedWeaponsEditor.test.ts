import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/svelte'
import OwnedWeaponsEditor from './OwnedWeaponsEditor.svelte'
import type { OwnedWeapon } from '$lib/models/player'

describe('OwnedWeaponsEditor', () => {
	const mockOwnedWeapons: OwnedWeapon[] = [{ weaponId: 'sword', materialId: null }]

	const defaultProps = {
		ownedWeapons: mockOwnedWeapons,
		onOwnedWeaponsChange: vi.fn()
	}

	it('should display currently owned weapons', () => {
		render(OwnedWeaponsEditor, { props: defaultProps })

		expect(screen.getByText('Sword')).toBeTruthy()
	})

	it('should allow adding a new weapon to owned list', async () => {
		const handleChange = vi.fn()
		render(OwnedWeaponsEditor, {
			props: {
				...defaultProps,
				onOwnedWeaponsChange: handleChange
			}
		})

		// Find and click "Add Weapon" button
		await fireEvent.click(screen.getByText('Add Weapon'))

		// Select a weapon from the list (Dagger should be available)
		await fireEvent.click(screen.getByText('Dagger'))

		expect(handleChange).toHaveBeenCalled()
		const newList = handleChange.mock.calls[0][0]
		expect(newList.some((w: OwnedWeapon) => w.weaponId === 'dagger')).toBe(true)
	})

	it('should allow removing a weapon from owned list', async () => {
		const handleChange = vi.fn()
		render(OwnedWeaponsEditor, {
			props: {
				...defaultProps,
				onOwnedWeaponsChange: handleChange
			}
		})

		// Find and click remove button for sword
		const removeButton = screen.getByLabelText('Remove Sword')
		await fireEvent.click(removeButton)

		expect(handleChange).toHaveBeenCalledWith([])
	})

	it('should allow setting material for owned weapon', async () => {
		const handleChange = vi.fn()
		render(OwnedWeaponsEditor, {
			props: {
				...defaultProps,
				onOwnedWeaponsChange: handleChange
			}
		})

		// Find material selector for sword
		const materialSelect = screen.getByLabelText('Material for Sword')
		await fireEvent.change(materialSelect, { target: { value: 'steel' } })

		expect(handleChange).toHaveBeenCalled()
		const newList = handleChange.mock.calls[0][0]
		expect(newList[0].materialId).toBe('steel')
	})

	it('should not show ammunition weapons in available weapons list', async () => {
		const handleChange = vi.fn()
		render(OwnedWeaponsEditor, {
			props: {
				ownedWeapons: [],
				onOwnedWeaponsChange: handleChange
			}
		})

		// Click "Add Weapon" to show available weapons
		await fireEvent.click(screen.getByText('Add Weapon'))

		// Arrow and Bolt are ammunition and should not be shown
		expect(screen.queryByText('Arrow')).toBeFalsy()
		expect(screen.queryByText('Bolt')).toBeFalsy()
	})

	it('should not show already owned weapons in available list', async () => {
		const handleChange = vi.fn()
		render(OwnedWeaponsEditor, {
			props: {
				...defaultProps,
				onOwnedWeaponsChange: handleChange
			}
		})

		// Click "Add Weapon" to show available weapons
		await fireEvent.click(screen.getByText('Add Weapon'))

		// Sword is already owned and should not appear in the available list
		// We need to check in the add panel, not in the owned list
		const addPanel = screen.getByText('Dagger').closest('.card')?.parentElement
		expect(addPanel).toBeTruthy()

		// Find all weapon buttons in the add panel (they should not include Sword)
		const buttons = addPanel?.querySelectorAll('button')
		const buttonTexts = Array.from(buttons || []).map((btn) => btn.textContent)
		// The Sword button in the add panel should not exist
		expect(buttonTexts.some((text) => text?.includes('Sword') && !text?.includes('Greatsword'))).toBe(
			false
		)
	})

	it('should display weapon stats (damage, AP cost, range)', () => {
		render(OwnedWeaponsEditor, { props: defaultProps })

		// Check for stats badges - sword has 3 damage, 2 AP, Adjacent range
		expect(screen.getByText('3 Dmg')).toBeTruthy()
		expect(screen.getByText('2 AP')).toBeTruthy()
		expect(screen.getByText('Adjacent')).toBeTruthy()
	})

	it('should show empty state when no weapons owned', () => {
		render(OwnedWeaponsEditor, {
			props: {
				ownedWeapons: [],
				onOwnedWeaponsChange: vi.fn()
			}
		})

		expect(screen.getByText('No weapons owned. Add weapons to your inventory.')).toBeTruthy()
	})
})
