export function camelToTitleCase(str: string): string {
	return str
		.replace(/([A-Z])/g, ' $1') // Insert space before each uppercase letter
		.replace(/^./, (firstChar) => firstChar.toUpperCase()) // Capitalize the first letter
		.trim() // Remove any leading or trailing spaces
}
