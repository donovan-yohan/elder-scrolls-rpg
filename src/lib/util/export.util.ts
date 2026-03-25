import type { PlayerData } from '$lib/models/player'
import { CHARACTER_SCHEMA_VERSION } from '$lib/version'

/**
 * Current app version for export format migration support
 */
export const APP_VERSION = CHARACTER_SCHEMA_VERSION

/**
 * Exported character structure for single character exports
 */
export interface ExportedCharacter {
	version: string
	exportedAt: string
	player: PlayerData
}

/**
 * Exported backup structure for multiple character exports
 */
export interface ExportedBackup {
	version: string
	exportedAt: string
	players: PlayerData[]
}

/**
 * Type guard to check if export is a single character
 */
export function isSingleCharacterExport(
	data: ExportedCharacter | ExportedBackup
): data is ExportedCharacter {
	return 'player' in data && !('players' in data)
}

/**
 * Type guard to check if export is a backup with multiple characters
 */
export function isMultipleCharacterExport(
	data: ExportedCharacter | ExportedBackup
): data is ExportedBackup {
	return 'players' in data && Array.isArray((data as ExportedBackup).players)
}

/**
 * Sanitize a filename by removing invalid characters
 */
function sanitizeFilename(name: string): string {
	return name
		.replace(/[<>:"/\\|?*\x00-\x1f]/g, '') // Remove invalid characters
		.replace(/\s+/g, '-') // Replace spaces with hyphens
		.replace(/-+/g, '-') // Replace multiple hyphens with single
		.trim() || 'unnamed-character'
}

/**
 * Get current date formatted as YYYY-MM-DD
 */
function getDateString(): string {
	const now = new Date()
	const year = now.getFullYear()
	const month = String(now.getMonth() + 1).padStart(2, '0')
	const day = String(now.getDate()).padStart(2, '0')
	return `${year}-${month}-${day}`
}

/**
 * Trigger browser download of a file
 */
function downloadFile(content: string, filename: string): void {
	const blob = new Blob([content], { type: 'application/json' })
	const url = URL.createObjectURL(blob)
	const link = document.createElement('a')
	link.href = url
	link.download = filename
	document.body.appendChild(link)
	link.click()
	document.body.removeChild(link)
	URL.revokeObjectURL(url)
}

/**
 * Export a single character to a JSON file
 * Generates filename: characterName-YYYY-MM-DD.esrpg
 */
export function exportCharacter(player: PlayerData): void {
	if (!player) {
		throw new Error('No character to export')
	}

	const exportData: ExportedCharacter = {
		version: APP_VERSION,
		exportedAt: new Date().toISOString(),
		player,
	}

	const characterName = sanitizeFilename(player.characterName || 'unnamed-character')
	const filename = `${characterName}-${getDateString()}.esrpg`

	downloadFile(JSON.stringify(exportData, null, 2), filename)
}

/**
 * Export all characters to a single backup file
 * Generates filename: esrpg-backup-YYYY-MM-DD.esrpg
 */
export function exportAllCharacters(players: Record<string, PlayerData>): void {
	const playerArray = Object.values(players)

	if (playerArray.length === 0) {
		throw new Error('No characters to export')
	}

	const exportData: ExportedBackup = {
		version: APP_VERSION,
		exportedAt: new Date().toISOString(),
		players: playerArray,
	}

	const filename = `esrpg-backup-${getDateString()}.esrpg`

	downloadFile(JSON.stringify(exportData, null, 2), filename)
}

/**
 * Get a summary of an exported character for preview
 */
export function getCharacterSummary(player: PlayerData): string {
	return `${player.characterName || 'Unnamed'} - Level ${player.level} ${player.race} ${player.archetype}`
}
