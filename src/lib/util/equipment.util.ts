import type { EquipmentSlot } from '$lib/models/player'
import { getWeaponById, type Weapon } from '$lib/data/weapons'
import { ArmorTypes, type ArmorType } from '$lib/data/armor'
import {
	Materials,
	getMaterialById,
	calculateMaterialValue,
	calculateMaterialWeight,
	type Material
} from '$lib/data/materials'

export interface EquippedWeapon {
	weapon: Weapon
	material: Material | null
	adjustedValue: number
	adjustedWeight: number
}

export interface EquippedArmor {
	armor: ArmorType
	material: Material | null
	adjustedValue: number
	adjustedWeight: number
}

// Default values for armor types (ArmorTypes don't have value/weight in data)
export const DEFAULT_ARMOR_VALUE = 100
export const DEFAULT_ARMOR_WEIGHT = 20

/**
 * Get equipped weapon with material adjustments
 * Returns null if slot.id is null, otherwise looks up weapon and applies material modifiers
 */
export function getEquippedWeapon(slot: EquipmentSlot): EquippedWeapon | null {
	if (!slot.id) {
		return null
	}

	const weapon = getWeaponById(slot.id)
	if (!weapon) {
		return null
	}

	const material = slot.materialId ? getMaterialById(slot.materialId) ?? null : null

	const adjustedValue = material
		? calculateMaterialValue(weapon.value, material)
		: weapon.value
	const adjustedWeight = material
		? calculateMaterialWeight(weapon.weight, material)
		: weapon.weight

	return {
		weapon,
		material,
		adjustedValue,
		adjustedWeight
	}
}

/**
 * Get equipped armor with material adjustments
 * Returns null if slot.id is null, otherwise looks up armor type and applies material modifiers
 * Uses default values for value (100) and weight (20) since ArmorTypes don't have these properties
 */
export function getEquippedArmor(slot: EquipmentSlot): EquippedArmor | null {
	if (!slot.id) {
		return null
	}

	const armor = ArmorTypes.find((a) => a.id === slot.id)
	if (!armor) {
		return null
	}

	const material = slot.materialId ? getMaterialById(slot.materialId) ?? null : null

	const adjustedValue = material
		? calculateMaterialValue(DEFAULT_ARMOR_VALUE, material)
		: DEFAULT_ARMOR_VALUE
	const adjustedWeight = material
		? calculateMaterialWeight(DEFAULT_ARMOR_WEIGHT, material)
		: DEFAULT_ARMOR_WEIGHT

	return {
		armor,
		material,
		adjustedValue,
		adjustedWeight
	}
}

/**
 * Get available materials for weapons (excludes armor-only materials like Hide/Leather)
 */
export function getWeaponMaterials(): Material[] {
	return Materials.filter((material) => !material.isArmorOnly)
}

/**
 * Get available materials for armor (all materials)
 */
export function getArmorMaterials(): Material[] {
	return Materials
}

/**
 * Get weapon-relevant special properties from material
 * Returns properties that contain "Weapon" in name OR don't contain "Armor"
 */
export function getWeaponMaterialProperties(material: Material): string[] {
	return material.specialProperties
		.filter((prop) => prop.name.includes('Weapon') || !prop.name.includes('Armor'))
		.map((prop) => `${prop.name}: ${prop.description}`)
}

/**
 * Get armor-relevant special properties from material
 * Returns properties that contain "Armor" in name OR don't contain "Weapon"
 */
export function getArmorMaterialProperties(material: Material): string[] {
	return material.specialProperties
		.filter((prop) => prop.name.includes('Armor') || !prop.name.includes('Weapon'))
		.map((prop) => `${prop.name}: ${prop.description}`)
}

/**
 * Create an empty equipment slot
 */
export function createEmptySlot(): EquipmentSlot {
	return {
		id: null,
		materialId: null
	}
}

/**
 * Create an equipment slot with item and optional material
 */
export function createEquipmentSlot(id: string, materialId?: string): EquipmentSlot {
	return {
		id,
		materialId: materialId ?? null
	}
}
