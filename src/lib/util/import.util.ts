import type { PlayerData } from '$lib/models/player'
import {
	APP_VERSION,
	type ExportedBackup,
	type ExportedCharacter,
	isMultipleCharacterExport,
	isSingleCharacterExport,
} from './export.util'
import { BirthSignName } from '$lib/data/birthSign'
import { ArchetypeName } from '$lib/data/archetype'
import { RaceName } from '$lib/data/race'

/**
 * Escape HTML entities for safe display in HTML contexts.
 * Note: This provides basic protection for rendering user strings,
 * but complete XSS prevention requires context-aware sanitization.
 */
function sanitizeString(str: string): string {
	const htmlEntities: Record<string, string> = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#39;',
	}
	return str.replace(/[&<>"']/g, (char) => htmlEntities[char] ?? char)
}

/**
 * Result of an import operation
 */
export interface ImportResult {
	success: boolean
	player?: PlayerData
	players?: PlayerData[]
	error?: string
	isMultiple?: boolean
}

/**
 * Required fields that must be present in a PlayerData object
 */
const REQUIRED_PLAYER_FIELDS: (keyof PlayerData)[] = [
	'id',
	'characterName',
	'playerName',
	'level',
	'race',
	'archetype',
	'birthSign',
]

/**
 * Validate that a value is a valid PlayerData object
 */
function isValidPlayerData(data: unknown): data is PlayerData {
	if (typeof data !== 'object' || data === null) {
		return false
	}

	const obj = data as Record<string, unknown>

	// Check required fields exist
	for (const field of REQUIRED_PLAYER_FIELDS) {
		if (!(field in obj)) {
			return false
		}
	}

	// Validate specific field types
	if (typeof obj.id !== 'string' || obj.id.length === 0) {
		return false
	}
	if (typeof obj.characterName !== 'string') {
		return false
	}
	if (typeof obj.playerName !== 'string') {
		return false
	}
	if (typeof obj.level !== 'number' || obj.level < 1 || obj.level > 20) {
		return false
	}

	// Validate enums
	if (!Object.values(RaceName).includes(obj.race as RaceName)) {
		return false
	}
	if (!Object.values(ArchetypeName).includes(obj.archetype as ArchetypeName)) {
		return false
	}
	if (!Object.values(BirthSignName).includes(obj.birthSign as BirthSignName)) {
		return false
	}

	return true
}

/**
 * Validate version compatibility
 * Currently accepts version 1.x.x
 */
function isCompatibleVersion(version: string): boolean {
	if (typeof version !== 'string') {
		return false
	}

	const [major] = version.split('.')
	// Accept version 1.x.x for now
	return major === '1'
}

/**
 * Validate and parse imported data
 */
export function validateImport(data: unknown): ImportResult {
	// Check basic structure
	if (typeof data !== 'object' || data === null) {
		return {
			success: false,
			error: 'Invalid file format: expected a JSON object',
		}
	}

	const obj = data as Record<string, unknown>

	// Check for version field
	if (!('version' in obj) || typeof obj.version !== 'string') {
		return {
			success: false,
			error: 'Invalid file format: missing version field',
		}
	}

	// Validate version compatibility
	if (!isCompatibleVersion(obj.version)) {
		return {
			success: false,
			error: `Incompatible version: ${obj.version}. Expected version 1.x.x`,
		}
	}

	// Check for exportedAt field (optional but expected)
	if ('exportedAt' in obj && typeof obj.exportedAt !== 'string') {
		return {
			success: false,
			error: 'Invalid file format: exportedAt must be a string',
		}
	}

	// Handle single character export
	if (isSingleCharacterExport(data as ExportedCharacter | ExportedBackup)) {
		const exportData = data as ExportedCharacter

		if (!isValidPlayerData(exportData.player)) {
			return {
				success: false,
				error: 'Invalid character data: missing or invalid required fields',
			}
		}

		return {
			success: true,
			player: exportData.player,
			isMultiple: false,
		}
	}

	// Handle multiple character export
	if (isMultipleCharacterExport(data as ExportedCharacter | ExportedBackup)) {
		const exportData = data as ExportedBackup

		if (!Array.isArray(exportData.players) || exportData.players.length === 0) {
			return {
				success: false,
				error: 'Invalid backup file: no characters found',
			}
		}

		// Validate each player
		const invalidIndex = exportData.players.findIndex((p) => !isValidPlayerData(p))
		if (invalidIndex !== -1) {
			return {
				success: false,
				error: `Invalid character data at position ${invalidIndex + 1}: missing or invalid required fields`,
			}
		}

		return {
			success: true,
			players: exportData.players,
			isMultiple: true,
		}
	}

	return {
		success: false,
		error: 'Invalid file format: must contain either "player" or "players" field',
	}
}

/**
 * Parse file and return import result
 */
export async function importFromFile(file: File): Promise<ImportResult> {
	// Validate file extension
	const validExtensions = ['.esrpg', '.json']
	const hasValidExtension = validExtensions.some((ext) =>
		file.name.toLowerCase().endsWith(ext)
	)

	if (!hasValidExtension) {
		return {
			success: false,
			error: `Invalid file type. Expected .esrpg or .json file`,
		}
	}

	// Read file content
	let content: string
	try {
		content = await file.text()
	} catch {
		return {
			success: false,
			error: 'Failed to read file',
		}
	}

	// Parse JSON
	let data: unknown
	try {
		data = JSON.parse(content)
	} catch {
		return {
			success: false,
			error: 'Invalid JSON format',
		}
	}

	// Validate and return result
	return validateImport(data)
}

/**
 * Generate a new unique ID for an imported character
 * Used when importing as a new character or when ID conflicts exist
 */
export function generateNewId(): string {
	return crypto.randomUUID()
}

/**
 * Prepare a player for import by optionally generating a new ID.
 * Also sanitizes string fields to prevent XSS.
 */
export function preparePlayerForImport(
	player: PlayerData,
	generateNewIdFlag: boolean = false
): PlayerData {
	const now = new Date().toISOString()
	return {
		...player,
		id: generateNewIdFlag ? generateNewId() : player.id,
		characterName: sanitizeString(player.characterName),
		playerName: sanitizeString(player.playerName),
		notes: sanitizeString(player.notes),
		updatedAt: now,
		createdAt: player.createdAt || now,
	}
}
