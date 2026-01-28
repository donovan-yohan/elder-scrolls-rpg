/**
 * Calculate the maximum spirit points for a given level.
 * Formula: floor(level / 4), minimum 1
 *
 * Spirit points serve as "second chances" - when HP drops to 0,
 * a spirit point can be spent to reset HP/MP/AP to max.
 */
export function calculateMaxSpiritPoints(level: number): number {
	return Math.max(1, Math.floor(level / 4))
}
