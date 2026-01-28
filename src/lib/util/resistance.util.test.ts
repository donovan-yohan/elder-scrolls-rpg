// src/lib/util/resistance.util.test.ts
import { describe, it, expect } from 'vitest'
import { RaceName } from '$lib/data/race'
import { DamageType } from '$lib/data/element'
import {
	calculateDamageWithResistances,
	getDisplayResistances,
	formatResistance,
} from './resistance.util'

describe('resistance.util', () => {
	describe('calculateDamageWithResistances', () => {
		describe('Argonian immunity', () => {
			it('should be immune to poison damage', () => {
				const result = calculateDamageWithResistances(RaceName.Argonian, 20, DamageType.Poison)
				expect(result.isImmune).toBe(true)
				expect(result.finalDamage).toBe(0)
				expect(result.reductionSources).toContain('Argonian immunity to Poison')
			})

			it('should be immune to disease damage', () => {
				const result = calculateDamageWithResistances(RaceName.Argonian, 15, DamageType.Disease)
				expect(result.isImmune).toBe(true)
				expect(result.finalDamage).toBe(0)
			})

			it('should take normal fire damage', () => {
				const result = calculateDamageWithResistances(RaceName.Argonian, 20, DamageType.Fire, true)
				expect(result.isImmune).toBe(false)
				expect(result.finalDamage).toBe(20)
			})
		})

		describe('Nord frost resistance', () => {
			it('should reduce frost damage by 10', () => {
				const result = calculateDamageWithResistances(RaceName.Nord, 25, DamageType.Frost)
				expect(result.flatReduction).toBe(10)
				expect(result.finalDamage).toBe(15)
				expect(result.reductionSources).toContain('Nord Frost resistance (-10)')
			})

			it('should floor damage to 0 if resistance exceeds damage', () => {
				const result = calculateDamageWithResistances(RaceName.Nord, 5, DamageType.Frost)
				expect(result.finalDamage).toBe(0)
			})

			it('should not affect fire damage', () => {
				const result = calculateDamageWithResistances(RaceName.Nord, 20, DamageType.Fire, true)
				expect(result.flatReduction).toBe(0)
				expect(result.finalDamage).toBe(20)
			})
		})

		describe('Dunmer fire resistance', () => {
			it('should reduce fire damage by 10', () => {
				const result = calculateDamageWithResistances(RaceName.Dunmer, 30, DamageType.Fire)
				expect(result.flatReduction).toBe(10)
				expect(result.finalDamage).toBe(20)
			})
		})

		describe('Redguard percentage resistance', () => {
			it('should reduce poison damage by 75%', () => {
				const result = calculateDamageWithResistances(RaceName.Redguard, 20, DamageType.Poison)
				expect(result.percentReduction).toBe(75)
				expect(result.finalDamage).toBe(5) // 20 - 15 (75% of 20)
			})

			it('should reduce disease damage by 75%', () => {
				const result = calculateDamageWithResistances(RaceName.Redguard, 40, DamageType.Disease)
				expect(result.finalDamage).toBe(10) // 40 - 30 (75% of 40)
			})
		})

		describe('Breton spell resistance', () => {
			it('should reduce magical damage by 5', () => {
				const result = calculateDamageWithResistances(
					RaceName.Breton,
					20,
					DamageType.Fire,
					true // magic source
				)
				expect(result.spellResistance).toBe(5)
				expect(result.finalDamage).toBe(15)
			})

			it('should apply to elemental magic damage', () => {
				const result = calculateDamageWithResistances(RaceName.Breton, 20, DamageType.Frost, true)
				expect(result.spellResistance).toBe(5)
				expect(result.finalDamage).toBe(15)
			})

			it('should not apply to physical damage', () => {
				const result = calculateDamageWithResistances(
					RaceName.Breton,
					20,
					DamageType.Physical,
					false
				)
				expect(result.spellResistance).toBe(0)
				expect(result.finalDamage).toBe(20)
			})
		})

		describe('Altmer spell weakness', () => {
			it('should increase magical damage by 5', () => {
				const result = calculateDamageWithResistances(RaceName.Altmer, 20, DamageType.Fire, true)
				expect(result.spellResistance).toBe(-5)
				expect(result.finalDamage).toBe(25)
				expect(result.reductionSources).toContain('Altmer spell weakness (+5)')
			})

			it('should still have disease resistance', () => {
				const result = calculateDamageWithResistances(RaceName.Altmer, 20, DamageType.Disease)
				expect(result.percentReduction).toBe(25)
				expect(result.finalDamage).toBe(15) // 20 - 5 (25% of 20)
			})
		})

		describe('Bosmer resistances', () => {
			it('should reduce poison by 50%', () => {
				const result = calculateDamageWithResistances(RaceName.Bosmer, 20, DamageType.Poison)
				expect(result.finalDamage).toBe(10)
			})

			it('should reduce disease by 50%', () => {
				const result = calculateDamageWithResistances(RaceName.Bosmer, 30, DamageType.Disease)
				expect(result.finalDamage).toBe(15)
			})
		})

		describe('Orsimer spell resistance', () => {
			it('should reduce magical damage by 2', () => {
				const result = calculateDamageWithResistances(RaceName.Orsimer, 20, DamageType.Shock, true)
				expect(result.spellResistance).toBe(2)
				expect(result.finalDamage).toBe(18)
			})
		})

		describe('races without resistances', () => {
			it('Imperial should take full damage', () => {
				const result = calculateDamageWithResistances(RaceName.Imperial, 20, DamageType.Fire, true)
				expect(result.finalDamage).toBe(20)
				expect(result.reductionSources).toHaveLength(0)
			})

			it('Khajiit should take full damage', () => {
				const result = calculateDamageWithResistances(RaceName.Khajiit, 20, DamageType.Poison)
				expect(result.finalDamage).toBe(20)
			})
		})
	})

	describe('getDisplayResistances', () => {
		it('should return formatted resistances for Argonian', () => {
			const displays = getDisplayResistances(RaceName.Argonian)
			expect(displays).toContain('Disease Immune')
			expect(displays).toContain('Poison Immune')
		})

		it('should return formatted resistances for Nord', () => {
			const displays = getDisplayResistances(RaceName.Nord)
			expect(displays).toContain('Frost +10')
			expect(displays).toContain('Non-magical cold (Immunity)')
		})

		it('should return formatted resistances for Breton', () => {
			const displays = getDisplayResistances(RaceName.Breton)
			expect(displays).toContain('Spell Resistance +5')
		})

		it('should return spell weakness for Altmer', () => {
			const displays = getDisplayResistances(RaceName.Altmer)
			expect(displays).toContain('Spell Resistance -5')
			expect(displays).toContain('Disease 25%')
		})

		it('should return empty array for Imperial', () => {
			const displays = getDisplayResistances(RaceName.Imperial)
			expect(displays).toHaveLength(0)
		})
	})

	describe('formatResistance', () => {
		it('should format immunity', () => {
			expect(formatResistance({ type: DamageType.Poison, immunity: true })).toBe('Poison Immune')
		})

		it('should format flat reduction', () => {
			expect(formatResistance({ type: DamageType.Fire, flatReduction: 10 })).toBe('Fire +10')
		})

		it('should format percentage reduction', () => {
			expect(formatResistance({ type: DamageType.Disease, percentReduction: 75 })).toBe(
				'Disease 75%'
			)
		})
	})
})
