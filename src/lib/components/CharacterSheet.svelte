<script lang="ts">
	import { Accordion, AccordionItem, ProgressBar, getToastStore } from '@skeletonlabs/skeleton'
	import type { PlayerData, Equipment, InventoryItem, OwnedWeapon } from '$lib/models/player'
	import { Skill } from '$lib/data/skill'
	import { BirthSigns } from '$lib/data/birthSign'
	import { Race } from '$lib/data/race'
	import { Level } from '$lib/data/level'
	import {
		calculateMaxHealth,
		calculateMaxMagicka,
		calculateMaxAP,
		calculateEffectiveMaxHealth,
		calculateEffectiveMaxMagicka,
		calculateEffectiveMaxAP,
		calculateMaxSpiritPoints,
		getStatBreakdown,
		getSubskillBonus,
		getSkillsWithLevels,
		getLevelUpChanges,
	} from '$lib/util/stats.util'
	import ComplicationsDisplay from './combat/ComplicationsDisplay.svelte'
	import { camelToTitleCase } from '$lib/util/string.util'
	import { getSpellById, SpellSchool, type Spell } from '$lib/data/spells'
	import { ArmorTypes } from '$lib/data/armor'
	import { getItemById } from '$lib/data/items'
	import { exportCharacter } from '$lib/util/export.util'
	import { SkillRollModal } from '$lib/components/skills'
	import { LevelUpWizard } from '$lib/components/levelup'
	import { EquipmentEditor } from '$lib/components/equipment'
	import { SpellPicker } from '$lib/components/spells'
	import { ShoutPicker } from '$lib/components/shouts'
	import { getShoutById, type Shout } from '$lib/data/shouts'
	import {
		getEquippedWeapon,
		getEquippedArmor,
		getWeaponMaterialProperties,
		getArmorMaterialProperties,
	} from '$lib/util/equipment.util'
	import type { SubSkill } from '$lib/models/subskill'
	import { getDisplayResistances } from '$lib/util/resistance.util'

	interface Props {
		player: PlayerData
		editMode?: boolean
		onUpdate?: (player: PlayerData) => void
		showResourceControls?: boolean
	}

	let { player, editMode = false, onUpdate, showResourceControls = false }: Props = $props()

	const toastStore = getToastStore()

	// Computed stats
	let maxHealth = $derived(calculateMaxHealth(player))
	let maxMagicka = $derived(calculateMaxMagicka(player))
	let maxAP = $derived(calculateMaxAP(player))
	let levelData = $derived(Level[player.level] ?? Level[1]!)

	// Effective stats after complications
	let effectiveMaxHealth = $derived(calculateEffectiveMaxHealth(player))
	let effectiveMaxMagicka = $derived(calculateEffectiveMaxMagicka(player))
	let effectiveMaxAP = $derived(calculateEffectiveMaxAP(player))
	let maxSpiritPoints = $derived(calculateMaxSpiritPoints(player.level))

	// Check if player has any stat-reducing complications
	let hasStatComplications = $derived(
		player.complications.some(c => c.type === 'hp' || c.type === 'ap' || c.type === 'mp')
	)

	// Stat breakdowns using shared utility
	let healthBreakdown = $derived(getStatBreakdown(player, 'health'))
	let magickaBreakdown = $derived(getStatBreakdown(player, 'magicka'))
	let apBreakdown = $derived(getStatBreakdown(player, 'actionPoints'))

	// Skill roll modal state
	let showSkillRollModal = $state(false)
	let selectedSkill: Skill | null = $state(null)

	// All skills organized by level
	let skillsByLevel = $derived(getSkillsWithLevels(player))

	// Birth sign skill modifiers for display
	let birthSignAdvantages = $derived(BirthSigns[player.birthSign]?.skillAdvantages ?? [])
	let birthSignDisadvantages = $derived(BirthSigns[player.birthSign]?.skillDisadvantages ?? [])

	// Racial resistances for display
	let racialResistances = $derived(getDisplayResistances(player.race))
	let hasResistances = $derived(racialResistances.length > 0)

	function openSkillRoll(skill: Skill) {
		selectedSkill = skill
		showSkillRollModal = true
	}

	function closeSkillRoll() {
		showSkillRollModal = false
		selectedSkill = null
	}

	// Level up wizard state
	let showLevelUpWizard = $state(false)

	// Check if level up has choices
	let canLevelUp = $derived(player.level < 20)
	let levelUpChanges = $derived(canLevelUp ? getLevelUpChanges(player.level, player.level + 1) : null)

	function openLevelUpWizard() {
		showLevelUpWizard = true
	}

	function closeLevelUpWizard() {
		showLevelUpWizard = false
	}

	function handleLevelUpComplete(data: {
		newLevel: number
		promotedToMajor: Skill[]
		promotedToMinor: Skill[]
		newSubskills: SubSkill[]
	}) {
		const { newLevel, promotedToMajor, promotedToMinor, newSubskills } = data

		// Build updated skill arrays
		const newMajorSkills = [...player.majorSkills, ...promotedToMajor]
		const newMinorSkills = [
			...player.minorSkills.filter(s => !promotedToMajor.includes(s)),
			...promotedToMinor
		]
		const updatedSubskills = [...(player.subSkills ?? []), ...newSubskills]

		// Build the updated player object with new level and skills
		const updatedPlayer: PlayerData = {
			...player,
			level: newLevel,
			majorSkills: newMajorSkills,
			minorSkills: newMinorSkills,
			subSkills: updatedSubskills,
		}

		// Recalculate all max stats based on the new level
		const newMaxHealth = calculateMaxHealth(updatedPlayer)
		const newMaxMagicka = calculateMaxMagicka(updatedPlayer)
		const newMaxAP = calculateMaxAP(updatedPlayer)
		const newMaxSpiritPoints = calculateMaxSpiritPoints(newLevel)

		// Apply all changes including recalculated stats reset to full
		if (onUpdate) {
			onUpdate({
				...updatedPlayer,
				maxHealth: newMaxHealth,
				health: newMaxHealth,
				maxMagicka: newMaxMagicka,
				magicka: newMaxMagicka,
				maxActionPoints: newMaxAP,
				actionPoints: newMaxAP,
				maxSpiritPoints: newMaxSpiritPoints,
				spiritPoints: newMaxSpiritPoints,
				currentSpiritPoints: newMaxSpiritPoints,
			})
		}

		showLevelUpWizard = false
	}

	// Character traits (subskills) - apply to any skill roll
	let hasTraits = $derived(player.subSkills && player.subSkills.length > 0)
	let traitBonus = $derived(getSubskillBonus(player.level))

	// Spells grouped by school
	let spellsBySchool = $derived(player.knownSpells.reduce(
		(acc, spellId) => {
			const spell = getSpellById(spellId)
			if (spell) {
				if (!acc[spell.school]) acc[spell.school] = []
				acc[spell.school].push(spell)
			}
			return acc
		},
		{} as Record<SpellSchool, Spell[]>,
	))

	let hasSpells = $derived(player.knownSpells.length > 0)

	// Known shouts
	let knownShoutDetails = $derived(
		(player.knownShouts ?? [])
			.map(id => getShoutById(id))
			.filter((s): s is Shout => s !== undefined)
	)
	let hasShouts = $derived((player.knownShouts ?? []).length > 0)

	// Equipment helpers - using new EquipmentSlot structure with material support
	let equippedWeapon = $derived(getEquippedWeapon(player.equipment.weapon))
	let equippedOffhand = $derived(getEquippedWeapon(player.equipment.offhand))
	let equippedArmor = $derived(getEquippedArmor(player.equipment.armor))

	// Equipment change handlers
	function handleEquipmentChange(newEquipment: Equipment) {
		if (onUpdate) {
			onUpdate({ ...player, equipment: newEquipment })
		}
	}

	function handleInventoryChange(newInventory: InventoryItem[]) {
		if (onUpdate) {
			onUpdate({ ...player, inventory: newInventory })
		}
	}

	function handleOwnedWeaponsChange(newOwnedWeapons: OwnedWeapon[]) {
		if (onUpdate) {
			onUpdate({ ...player, ownedWeapons: newOwnedWeapons })
		}
	}

	function handleSpellsChange(newSpells: string[]) {
		if (onUpdate) {
			onUpdate({ ...player, knownSpells: newSpells })
		}
	}

	function handleShoutsChange(newShouts: string[]) {
		if (onUpdate) {
			onUpdate({ ...player, knownShouts: newShouts })
		}
	}

	// Inventory items
	let inventoryItems = $derived(player.inventory
		.map((inv) => ({
			item: getItemById(inv.itemId),
			quantity: inv.quantity,
		}))
		.filter((i) => i.item !== undefined))

	// Consolidated resource adjustment function (DRY)
	function adjustResource(stat: 'health' | 'magicka', delta: number) {
		const maxValue = stat === 'health' ? effectiveMaxHealth : effectiveMaxMagicka
		const currentValue = player[stat]
		const newValue = Math.max(0, Math.min(maxValue, currentValue + delta))
		if (newValue !== currentValue && onUpdate) {
			onUpdate({ ...player, [stat]: newValue })
		}
	}

	// Handle current stat updates
	function updateCurrentStat(stat: 'health' | 'magicka' | 'actionPoints', value: number) {
		const maxStatMap: Record<'health' | 'magicka' | 'actionPoints', number> = {
			health: maxHealth,
			magicka: maxMagicka,
			actionPoints: maxAP,
		}
		const maxStat = maxStatMap[stat]
		const clampedValue = Math.max(0, Math.min(value, maxStat))

		if (onUpdate) {
			onUpdate({ ...player, [stat]: clampedValue })
		}
	}

	function updateNotes(notes: string) {
		if (onUpdate) {
			onUpdate({ ...player, notes })
		}
	}

	function updateLevel(level: number) {
		if (onUpdate) {
			onUpdate({ ...player, level: Math.max(1, Math.min(20, level)) })
		}
	}

	// Get spell level badge color
	function getSpellLevelColor(level: string): string {
		switch (level) {
			case 'Novice': return 'variant-filled-success'
			case 'Apprentice': return 'variant-filled-secondary'
			case 'Adept': return 'variant-filled-warning'
			case 'Expert': return 'variant-filled-error'
			case 'Master': return 'variant-filled-primary'
			default: return 'variant-filled'
		}
	}

	function handleExport() {
		try {
			exportCharacter(player)
			toastStore.trigger({
				message: `Exported ${player.characterName || 'character'} successfully`,
				background: 'variant-filled-success',
				timeout: 3000,
			})
		} catch (error) {
			toastStore.trigger({
				message: error instanceof Error ? error.message : 'Failed to export character',
				background: 'variant-filled-error',
				timeout: 5000,
			})
		}
	}
</script>

<div class="character-sheet space-y-6">
	<!-- Header Section -->
	<header class="card p-6 variant-soft-surface">
		<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
			<div class="flex-1">
				<h1 class="h1 font-bold tracking-tight">{player.characterName || 'Unnamed Hero'}</h1>
				<p class="text-surface-600-300-token">Player: {player.playerName || 'Unknown'}</p>
			</div>
			<div class="flex flex-wrap gap-2 items-center">
				<span class="badge variant-filled-primary text-lg px-4 py-2">
					{#if editMode}
						<span class="mr-2">Level</span>
						<input
							type="number"
							class="input w-16 h-8 text-center variant-filled-primary"
							min="1"
							max="20"
							value={player.level}
							onchange={(e) => updateLevel(parseInt(e.currentTarget.value) || 1)}
						/>
					{:else}
						Level {player.level}
						{#if canLevelUp}
							<button
								type="button"
								class="ml-2 btn btn-sm variant-filled-success"
								onclick={openLevelUpWizard}
							>
								Level Up
							</button>
						{/if}
					{/if}
				</span>
				<span class="badge variant-soft-tertiary text-base px-3 py-1.5">{player.race}</span>
				<span class="badge variant-soft-secondary text-base px-3 py-1.5">{player.archetype}</span>
				<span class="badge variant-soft-warning text-base px-3 py-1.5">{player.birthSign}</span>
			</div>
		</div>
		<div class="mt-4 flex gap-2">
			<button class="btn btn-sm variant-ghost-surface" onclick={handleExport}>
				<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
				</svg>
				Export Character
			</button>
		</div>
	</header>

	<!-- Stats Block -->
	<section class="grid grid-cols-1 md:grid-cols-3 gap-4">
		<!-- Health -->
		<div class="card p-4 variant-soft-error">
			<div class="flex justify-between items-center mb-2">
				<h3 class="h4 font-bold text-error-700 dark:text-error-300">Health</h3>
				<div class="flex items-center gap-2">
					{#if editMode}
						<input
							type="number"
							class="input w-16 h-8 text-center"
							min="0"
							max={effectiveMaxHealth}
							value={player.health}
							onchange={(e) => updateCurrentStat('health', parseInt(e.currentTarget.value) || 0)}
						/>
						<span class="text-xl font-bold">/ {effectiveMaxHealth}</span>
					{:else}
						<div class="flex items-center gap-2">
							{#if showResourceControls}
								<button
									type="button"
									class="btn-icon btn-icon-sm variant-soft-error"
									onclick={() => adjustResource('health', -1)}
									disabled={player.health <= 0}
								>-</button>
							{/if}
							<span class="text-2xl font-bold">
								{player.health} / {effectiveMaxHealth}
								{#if effectiveMaxHealth < maxHealth}
									<span class="text-sm text-error-400">({maxHealth})</span>
								{/if}
							</span>
							{#if showResourceControls}
								<button
									type="button"
									class="btn-icon btn-icon-sm variant-soft-error"
									onclick={() => adjustResource('health', 1)}
									disabled={player.health >= effectiveMaxHealth}
								>+</button>
							{/if}
						</div>
					{/if}
				</div>
			</div>
			<ProgressBar
				value={player.health}
				max={effectiveMaxHealth}
				meter="bg-error-500"
				track="bg-error-500/20"
				height="h-4"
				rounded="rounded-full"
			/>
			<div class="mt-2 text-sm text-surface-600-300-token">
				<span class="cursor-help" title="Base from {player.archetype}: {healthBreakdown.base}, Race bonus: +{healthBreakdown.racial}, Birth Sign: {healthBreakdown.birthSign !== 0 ? (healthBreakdown.birthSign > 0 ? '+' : '') + healthBreakdown.birthSign : 'none'}">
					Base: {healthBreakdown.base}
					{#if healthBreakdown.racial > 0}
						<span class="text-success-600 dark:text-success-400">+{healthBreakdown.racial} race</span>
					{/if}
					{#if healthBreakdown.birthSign !== 0}
						<span class="text-warning-600 dark:text-warning-400">{healthBreakdown.birthSign > 0 ? '+' : ''}{healthBreakdown.birthSign} sign</span>
					{/if}
					{#if effectiveMaxHealth < maxHealth}
						<span class="text-error-400">-{maxHealth - effectiveMaxHealth} wounds</span>
					{/if}
				</span>
			</div>
		</div>

		<!-- Magicka -->
		<div class="card p-4 variant-soft-primary">
			<div class="flex justify-between items-center mb-2">
				<h3 class="h4 font-bold text-primary-700 dark:text-primary-300">Magicka</h3>
				<div class="flex items-center gap-2">
					{#if editMode}
						<input
							type="number"
							class="input w-16 h-8 text-center"
							min="0"
							max={effectiveMaxMagicka}
							value={player.magicka}
							onchange={(e) => updateCurrentStat('magicka', parseInt(e.currentTarget.value) || 0)}
						/>
						<span class="text-xl font-bold">/ {effectiveMaxMagicka}</span>
					{:else}
						<div class="flex items-center gap-2">
							{#if showResourceControls}
								<button
									type="button"
									class="btn-icon btn-icon-sm variant-soft-primary"
									onclick={() => adjustResource('magicka', -1)}
									disabled={player.magicka <= 0}
								>-</button>
							{/if}
							<span class="text-2xl font-bold">
								{player.magicka} / {effectiveMaxMagicka}
								{#if effectiveMaxMagicka < maxMagicka}
									<span class="text-sm text-error-400">({maxMagicka})</span>
								{/if}
							</span>
							{#if showResourceControls}
								<button
									type="button"
									class="btn-icon btn-icon-sm variant-soft-primary"
									onclick={() => adjustResource('magicka', 1)}
									disabled={player.magicka >= effectiveMaxMagicka}
								>+</button>
							{/if}
						</div>
					{/if}
				</div>
			</div>
			<ProgressBar
				value={player.magicka}
				max={effectiveMaxMagicka}
				meter="bg-primary-500"
				track="bg-primary-500/20"
				height="h-4"
				rounded="rounded-full"
			/>
			<div class="mt-2 text-sm text-surface-600-300-token">
				<span class="cursor-help">
					Base: {magickaBreakdown.base}
					{#if magickaBreakdown.racial > 0}
						<span class="text-success-600 dark:text-success-400">+{magickaBreakdown.racial} race</span>
					{/if}
					{#if magickaBreakdown.birthSign !== 0}
						<span class="text-warning-600 dark:text-warning-400">{magickaBreakdown.birthSign > 0 ? '+' : ''}{magickaBreakdown.birthSign} sign</span>
					{/if}
					{#if effectiveMaxMagicka < maxMagicka}
						<span class="text-error-400">-{maxMagicka - effectiveMaxMagicka} wounds</span>
					{/if}
				</span>
			</div>
		</div>

		<!-- Action Points -->
		<div class="card p-4 variant-soft-success">
			<div class="flex justify-between items-center mb-2">
				<h3 class="h4 font-bold text-success-700 dark:text-success-300">Action Points</h3>
				<div class="flex items-center gap-2">
					{#if editMode}
						<input
							type="number"
							class="input w-16 h-8 text-center"
							min="0"
							max={effectiveMaxAP}
							value={player.actionPoints}
							onchange={(e) => updateCurrentStat('actionPoints', parseInt(e.currentTarget.value) || 0)}
						/>
						<span class="text-xl font-bold">/ {effectiveMaxAP}</span>
					{:else}
						<span class="text-2xl font-bold">
							{player.actionPoints} / {effectiveMaxAP}
							{#if effectiveMaxAP < maxAP}
								<span class="text-sm text-error-400">({maxAP})</span>
							{/if}
						</span>
					{/if}
				</div>
			</div>
			<ProgressBar
				value={player.actionPoints}
				max={effectiveMaxAP}
				meter="bg-success-500"
				track="bg-success-500/20"
				height="h-4"
				rounded="rounded-full"
			/>
			<div class="mt-2 text-sm text-surface-600-300-token">
				<span class="cursor-help">
					Base: {apBreakdown.base}
					{#if apBreakdown.racial > 0}
						<span class="text-success-600 dark:text-success-400">+{apBreakdown.racial} race</span>
					{/if}
					{#if apBreakdown.birthSign !== 0}
						<span class="text-warning-600 dark:text-warning-400">{apBreakdown.birthSign > 0 ? '+' : ''}{apBreakdown.birthSign} sign</span>
					{/if}
					{#if effectiveMaxAP < maxAP}
						<span class="text-error-400">-{maxAP - effectiveMaxAP} wounds</span>
					{/if}
				</span>
			</div>
		</div>
	</section>

	<!-- Combat Stats Summary -->
	<section class="card p-4 variant-soft-surface">
		<h3 class="h4 font-bold mb-3">Combat Statistics</h3>
		<div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
			<div>
				<div class="text-sm text-surface-600-300-token">Critical Range</div>
				<div class="text-xl font-bold">{levelData.critical}-20</div>
			</div>
			<div>
				<div class="text-sm text-surface-600-300-token">Critical Fail Range</div>
				<div class="text-xl font-bold">1-{levelData.criticalFail}</div>
			</div>
			<div>
				<div class="text-sm text-surface-600-300-token">Major Skill Bonus</div>
				<div class="text-xl font-bold text-primary-600 dark:text-primary-400">+{levelData.majorSkillBonus}</div>
			</div>
			<div>
				<div class="text-sm text-surface-600-300-token">Minor Skill Bonus</div>
				<div class="text-xl font-bold text-secondary-600 dark:text-secondary-400">+{levelData.minorSkillBonus}</div>
			</div>
		</div>
	</section>

	<!-- Fortune Points (visible outside combat) -->
	<section class="card p-4 variant-soft-surface">
		<h3 class="h4 font-bold mb-3">Fortune & Misfortune</h3>
		<div class="grid grid-cols-2 gap-4">
			<div class="text-center">
				<div class="text-3xl font-bold text-tertiary-500">{player.fortunePoints}</div>
				<div class="text-sm opacity-75">Fortune Points</div>
				<div class="text-xs mt-1 opacity-50">Spend to convert any roll into a critical success</div>
			</div>
			<div class="text-center">
				<div class="text-3xl font-bold text-warning-500">{player.misfortunePoints}</div>
				<div class="text-sm opacity-75">Misfortune Points</div>
				<div class="text-xs mt-1 opacity-50">GM can invoke at dramatic moments</div>
			</div>
		</div>
	</section>

	<!-- Skills Section -->
	<section class="grid grid-cols-1 md:grid-cols-3 gap-4">
		<!-- Major Skills -->
		<div class="card p-4 variant-soft-primary">
			<h3 class="h4 font-bold mb-3 text-primary-700 dark:text-primary-300">
				Major Skills
				<span class="text-sm font-normal text-surface-600-300-token">(+{levelData.majorSkillBonus})</span>
			</h3>
			{#if skillsByLevel.major.length > 0}
				<div class="space-y-1">
					{#each skillsByLevel.major as { skill, bonus }}
						<button
							type="button"
							class="w-full flex justify-between items-center py-2 px-2 rounded hover:bg-primary-500/10 transition-colors text-left"
							onclick={() => openSkillRoll(skill)}
						>
							<span class="font-medium text-primary-700 dark:text-primary-300">
								{camelToTitleCase(skill)}
								{#if birthSignAdvantages.includes(skill)}
									<span class="text-success-500" title="Advantage from Birth Sign">▲</span>
								{:else if birthSignDisadvantages.includes(skill)}
									<span class="text-error-500" title="Disadvantage from Birth Sign">▼</span>
								{/if}
							</span>
							<span class="badge variant-filled-primary">+{bonus}</span>
						</button>
					{/each}
				</div>
			{:else}
				<p class="text-surface-500">No major skills selected</p>
			{/if}
		</div>

		<!-- Minor Skills -->
		<div class="card p-4 variant-soft-secondary">
			<h3 class="h4 font-bold mb-3 text-secondary-700 dark:text-secondary-300">
				Minor Skills
				<span class="text-sm font-normal text-surface-600-300-token">(+{levelData.minorSkillBonus})</span>
			</h3>
			{#if skillsByLevel.minor.length > 0}
				<div class="space-y-1">
					{#each skillsByLevel.minor as { skill, bonus }}
						<button
							type="button"
							class="w-full flex justify-between items-center py-2 px-2 rounded hover:bg-secondary-500/10 transition-colors text-left"
							onclick={() => openSkillRoll(skill)}
						>
							<span class="font-medium text-secondary-700 dark:text-secondary-300">
								{camelToTitleCase(skill)}
								{#if birthSignAdvantages.includes(skill)}
									<span class="text-success-500" title="Advantage from Birth Sign">▲</span>
								{:else if birthSignDisadvantages.includes(skill)}
									<span class="text-error-500" title="Disadvantage from Birth Sign">▼</span>
								{/if}
							</span>
							<span class="badge variant-filled-secondary">+{bonus}</span>
						</button>
					{/each}
				</div>
			{:else}
				<p class="text-surface-500">No minor skills selected</p>
			{/if}
		</div>

		<!-- Untrained Skills -->
		<div class="card p-4 variant-soft-surface">
			<h3 class="h4 font-bold mb-3 text-surface-700 dark:text-surface-300">
				Untrained
				<span class="text-sm font-normal text-surface-600-300-token">(+0)</span>
			</h3>
			{#if skillsByLevel.untrained.length > 0}
				<div class="space-y-1 max-h-64 overflow-y-auto">
					{#each skillsByLevel.untrained as { skill, bonus }}
						<button
							type="button"
							class="w-full flex justify-between items-center py-2 px-2 rounded hover:bg-surface-500/10 transition-colors text-left"
							onclick={() => openSkillRoll(skill)}
						>
							<span class="font-medium text-surface-700 dark:text-surface-300">
								{camelToTitleCase(skill)}
								{#if birthSignAdvantages.includes(skill)}
									<span class="text-success-500" title="Advantage from Birth Sign">▲</span>
								{:else if birthSignDisadvantages.includes(skill)}
									<span class="text-error-500" title="Disadvantage from Birth Sign">▼</span>
								{/if}
							</span>
							<span class="badge variant-soft-surface">+{bonus}</span>
						</button>
					{/each}
				</div>
			{:else}
				<p class="text-surface-500">All skills are trained</p>
			{/if}
		</div>
	</section>

	<!-- Character Traits Section -->
	{#if hasTraits}
		<section class="card p-4 variant-soft-success">
			<h3 class="h4 font-bold mb-3 text-success-700 dark:text-success-300">
				Character Traits
				<span class="text-sm font-normal text-surface-600-300-token">(+{traitBonus} when invoked)</span>
			</h3>
			<p class="text-sm text-surface-500 mb-3">
				Invoke a trait on any skill roll if the GM agrees it applies.
			</p>
			<div class="space-y-2">
				{#each player.subSkills as trait}
					<div class="flex flex-col py-2 border-b border-surface-300-600-token">
						<div class="flex justify-between items-center">
							<span class="font-medium">{trait.name}</span>
							<span class="badge variant-filled-success">+{traitBonus}</span>
						</div>
						{#if trait.description}
							<p class="text-sm text-surface-500 mt-1">{trait.description}</p>
						{/if}
					</div>
				{/each}
			</div>
		</section>
	{/if}

	<!-- Spells Section -->
	{#if hasSpells || editMode}
		<section class="card p-4 variant-soft-tertiary">
			<h3 class="h4 font-bold mb-3 text-tertiary-700 dark:text-tertiary-300">Spells</h3>
			{#if editMode}
				<!-- Edit Mode: Show SpellPicker -->
				<SpellPicker
					knownSpells={player.knownSpells}
					onchange={handleSpellsChange}
				/>
			{:else}
				<!-- View Mode: Show spell details -->
				<Accordion>
					{#each Object.entries(spellsBySchool) as [school, spells]}
						<AccordionItem open>
							<svelte:fragment slot="lead">
								<span class="badge variant-soft-tertiary">{spells.length}</span>
							</svelte:fragment>
							<svelte:fragment slot="summary">
								<span class="font-semibold">{school}</span>
							</svelte:fragment>
							<svelte:fragment slot="content">
								<div class="space-y-3">
									{#each spells as spell}
										<div class="card p-3 variant-ghost-surface">
											<div class="flex flex-wrap justify-between items-start gap-2">
												<div class="flex items-center gap-2">
													<span class="font-bold">{spell.name}</span>
													<span class="badge {getSpellLevelColor(spell.level)} text-xs">{spell.level}</span>
													{#if spell.isConcentration}
														<span class="badge variant-soft-warning text-xs">Concentration</span>
													{/if}
													{#if spell.isReaction}
														<span class="badge variant-soft-error text-xs">Reaction</span>
													{/if}
												</div>
												<div class="flex gap-2">
													<span class="badge variant-filled-success">{spell.apCost} AP</span>
													<span class="badge variant-filled-primary">{spell.mpCost} MP</span>
												</div>
											</div>
											<p class="text-sm text-surface-600-300-token mt-2">{spell.description}</p>
											<div class="flex flex-wrap gap-2 mt-2 text-xs text-surface-500">
												<span>Range: {spell.range}</span>
												<span>Shape: {spell.shape}</span>
												{#if spell.duration > 0}
													<span>Duration: {spell.duration} rounds</span>
												{/if}
											</div>
										</div>
									{/each}
								</div>
							</svelte:fragment>
						</AccordionItem>
					{/each}
				</Accordion>
			{/if}
		</section>
	{/if}

	<!-- Dragon Shouts Section -->
	{#if hasShouts || editMode}
		<section class="card p-4 variant-soft-warning">
			<h3 class="h4 font-bold mb-3 text-warning-700 dark:text-warning-300">Dragon Shouts</h3>
			<p class="text-sm text-surface-500 mb-4">
				Cost: <span class="font-semibold text-warning-400">1 AP</span> and <span class="font-semibold text-primary-400">2 MP</span> per word
			</p>
			{#if editMode}
				<!-- Edit Mode: Show ShoutPicker -->
				<ShoutPicker
					knownShouts={player.knownShouts ?? []}
					onchange={handleShoutsChange}
				/>
			{:else}
				<!-- View Mode: Show shout details -->
				<div class="space-y-4">
					{#each knownShoutDetails as shout (shout.id)}
						<div class="card p-4 variant-ghost-surface">
							<div class="flex items-start justify-between gap-2 mb-2">
								<h4 class="font-bold text-lg">{shout.name}</h4>
							</div>
							<p class="text-sm text-surface-400 mb-3">{shout.description}</p>

							{#if shout.resolve}
								<p class="text-xs text-warning-400 mb-3 italic">{shout.resolve}</p>
							{/if}

							<div class="space-y-2">
								{#each shout.words as word, index}
									<div class="flex items-start gap-3 p-2 rounded bg-surface-700/50">
										<div class="flex-shrink-0 w-6 h-6 rounded-full bg-warning-500/30 flex items-center justify-center text-xs font-bold text-warning-300">
											{index + 1}
										</div>
										<div class="flex-1 min-w-0">
											<div class="flex items-center gap-2 flex-wrap">
												<span class="font-semibold text-warning-300">{word.word}</span>
												<span class="text-surface-500">({word.translation})</span>
												<span class="badge variant-soft-surface text-xs">{word.range}</span>
											</div>
											<p class="text-sm text-surface-400 mt-1">{word.effect}</p>
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</section>
	{/if}

	<!-- Equipment Section -->
	<section class="card p-4 variant-soft-surface">
		<h3 class="h4 font-bold mb-3">Equipment</h3>
		{#if editMode}
			<!-- Edit Mode: Show EquipmentEditor -->
			<EquipmentEditor
				equipment={player.equipment}
				inventory={player.inventory}
				onEquipmentChange={handleEquipmentChange}
				onInventoryChange={handleInventoryChange}
				ownedWeapons={player.ownedWeapons}
				onOwnedWeaponsChange={handleOwnedWeaponsChange}
			/>
		{:else}
			<!-- View Mode: Show equipment with material info -->
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
				<!-- Weapon -->
				<div class="card p-3 variant-ghost-surface">
					<h4 class="font-semibold text-sm text-surface-600-300-token mb-2">Weapon</h4>
					{#if equippedWeapon}
						<div class="font-bold">
							{#if equippedWeapon.material}
								{equippedWeapon.material.name} {equippedWeapon.weapon.name}
							{:else}
								{equippedWeapon.weapon.name}
							{/if}
						</div>
						<div class="text-sm space-y-1 mt-2">
							<div class="flex justify-between">
								<span>Damage:</span>
								<span>{equippedWeapon.weapon.baseDamageLethal ?? equippedWeapon.weapon.baseDamageBlunted}</span>
							</div>
							<div class="flex justify-between">
								<span>AP Cost:</span>
								<span>{equippedWeapon.weapon.apCost}</span>
							</div>
							<div class="flex justify-between">
								<span>Range:</span>
								<span>{equippedWeapon.weapon.range}</span>
							</div>
							{#if equippedWeapon.weapon.maxBonusDamage > 0}
								<div class="flex justify-between">
									<span>Max Bonus Dmg:</span>
									<span>+{equippedWeapon.weapon.maxBonusDamage}</span>
								</div>
							{/if}
							<div class="flex justify-between">
								<span>Value:</span>
								<span>{equippedWeapon.adjustedValue}g</span>
							</div>
							<div class="flex justify-between">
								<span>Weight:</span>
								<span>{equippedWeapon.adjustedWeight} lbs</span>
							</div>
						</div>
						{#if equippedWeapon.material}
							<div class="mt-3 pt-2 border-t border-surface-300-600-token">
								<div class="text-xs text-surface-500 mb-1">Material Properties:</div>
								{#each getWeaponMaterialProperties(equippedWeapon.material) as prop}
									<div class="text-xs text-tertiary-600 dark:text-tertiary-400">{prop}</div>
								{/each}
							</div>
						{/if}
					{:else}
						<span class="text-surface-500">Unarmed</span>
					{/if}
				</div>

				<!-- Offhand -->
				<div class="card p-3 variant-ghost-surface">
					<h4 class="font-semibold text-sm text-surface-600-300-token mb-2">Off-Hand</h4>
					{#if equippedOffhand}
						<div class="font-bold">
							{#if equippedOffhand.material}
								{equippedOffhand.material.name} {equippedOffhand.weapon.name}
							{:else}
								{equippedOffhand.weapon.name}
							{/if}
						</div>
						<div class="text-sm space-y-1 mt-2">
							{#if equippedOffhand.weapon.isShield}
								<div class="flex justify-between">
									<span>Block Bonus:</span>
									<span>+{equippedOffhand.weapon.baseDamageBlunted}</span>
								</div>
							{:else}
								<div class="flex justify-between">
									<span>Damage:</span>
									<span>{equippedOffhand.weapon.baseDamageLethal ?? equippedOffhand.weapon.baseDamageBlunted}</span>
								</div>
							{/if}
							<div class="flex justify-between">
								<span>AP Cost:</span>
								<span>{equippedOffhand.weapon.apCost}</span>
							</div>
							<div class="flex justify-between">
								<span>Value:</span>
								<span>{equippedOffhand.adjustedValue}g</span>
							</div>
							<div class="flex justify-between">
								<span>Weight:</span>
								<span>{equippedOffhand.adjustedWeight} lbs</span>
							</div>
						</div>
						{#if equippedOffhand.material}
							<div class="mt-3 pt-2 border-t border-surface-300-600-token">
								<div class="text-xs text-surface-500 mb-1">Material Properties:</div>
								{#each getWeaponMaterialProperties(equippedOffhand.material) as prop}
									<div class="text-xs text-tertiary-600 dark:text-tertiary-400">{prop}</div>
								{/each}
							</div>
						{/if}
					{:else}
						<span class="text-surface-500">Empty</span>
					{/if}
				</div>

				<!-- Armor -->
				<div class="card p-3 variant-ghost-surface">
					<h4 class="font-semibold text-sm text-surface-600-300-token mb-2">Armor</h4>
					{#if equippedArmor}
						<div class="font-bold">
							{#if equippedArmor.material}
								{equippedArmor.material.name} {equippedArmor.armor.name}
							{:else}
								{equippedArmor.armor.name}
							{/if}
						</div>
						<div class="text-sm space-y-1 mt-2">
							<div class="flex justify-between">
								<span>AC Bonus:</span>
								<span>+{equippedArmor.armor.acBonus}</span>
							</div>
							<div class="flex justify-between">
								<span>Dodge Bonus:</span>
								<span class={equippedArmor.armor.dodgeBonus < 0 ? 'text-error-500' : ''}>
									{equippedArmor.armor.dodgeBonus >= 0 ? '+' : ''}{equippedArmor.armor.dodgeBonus}
								</span>
							</div>
							{#if equippedArmor.armor.magickaCastModifier !== 'none'}
								<div class="flex justify-between">
									<span>Spellcasting:</span>
									<span class="capitalize">{equippedArmor.armor.magickaCastModifier}</span>
								</div>
							{/if}
							<div class="flex justify-between">
								<span>Value:</span>
								<span>{equippedArmor.adjustedValue}g</span>
							</div>
							<div class="flex justify-between">
								<span>Weight:</span>
								<span>{equippedArmor.adjustedWeight} lbs</span>
							</div>
						</div>
						{#if equippedArmor.material}
							<div class="mt-3 pt-2 border-t border-surface-300-600-token">
								<div class="text-xs text-surface-500 mb-1">Material Properties:</div>
								{#each getArmorMaterialProperties(equippedArmor.material) as prop}
									<div class="text-xs text-tertiary-600 dark:text-tertiary-400">{prop}</div>
								{/each}
							</div>
						{/if}
					{:else}
						<span class="text-surface-500">Unarmored</span>
						<div class="text-sm mt-2">
							<div class="flex justify-between">
								<span>Dodge Bonus:</span>
								<span class="text-success-500">+10</span>
							</div>
						</div>
					{/if}
				</div>
			</div>
		{/if}
	</section>

	<!-- Inventory Section -->
	{#if inventoryItems.length > 0 || editMode}
		<section class="card p-4 variant-soft-surface">
			<Accordion>
				<AccordionItem>
					<svelte:fragment slot="lead">
						<span class="badge variant-soft">{inventoryItems.length}</span>
					</svelte:fragment>
					<svelte:fragment slot="summary">
						<span class="h4 font-bold">Inventory</span>
					</svelte:fragment>
					<svelte:fragment slot="content">
						{#if editMode}
							<p class="edit-hint" style="font-style: italic; color: var(--text-muted, #666); margin-bottom: 0.75rem;">
								Edit inventory items in the Equipment section above (Items tab)
							</p>
						{/if}
						<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
							{#each inventoryItems as { item, quantity }}
								{#if item}
									<div class="card p-3 variant-ghost-surface flex justify-between items-center">
										<div>
											<div class="font-medium">{item.name}</div>
											<div class="text-xs text-surface-500">{item.type}</div>
										</div>
										<span class="badge variant-filled">{quantity}x</span>
									</div>
								{/if}
							{/each}
						</div>
					</svelte:fragment>
				</AccordionItem>
			</Accordion>
		</section>
	{/if}

	<!-- Race & Birth Sign Details -->
	<section class="grid grid-cols-1 md:grid-cols-2 gap-4">
		<!-- Race Details -->
		<div class="card p-4 variant-soft-surface">
			<h3 class="h4 font-bold mb-2">{player.race} Traits</h3>
			<p class="text-sm whitespace-pre-line text-surface-600-300-token">
				{Race[player.race]?.description ?? 'No description available'}
			</p>

			{#if hasResistances}
				<div class="mt-3 pt-3 border-t border-surface-300-600-token">
					<h4 class="text-sm font-semibold text-surface-600-300-token mb-2">Resistances</h4>
					<div class="flex flex-wrap gap-2">
						{#each racialResistances as resistance}
							<span class="badge variant-soft-tertiary text-xs">{resistance}</span>
						{/each}
					</div>
				</div>
			{/if}
		</div>

		<!-- Birth Sign Details -->
		<div class="card p-4 variant-soft-surface">
			<h3 class="h4 font-bold mb-2">The {player.birthSign}</h3>
			{#if BirthSigns[player.birthSign]?.notes}
				<p class="text-sm text-surface-600-300-token mb-2">
					{BirthSigns[player.birthSign].notes}
				</p>
			{/if}
			{#if BirthSigns[player.birthSign]?.skillAdvantages?.length}
				<div class="text-sm">
					<span class="text-success-600 dark:text-success-400">Advantage:</span>
					{BirthSigns[player.birthSign].skillAdvantages?.map(camelToTitleCase).join(', ')}
				</div>
			{/if}
			{#if BirthSigns[player.birthSign]?.skillDisadvantages?.length}
				<div class="text-sm">
					<span class="text-error-600 dark:text-error-400">Disadvantage:</span>
					{BirthSigns[player.birthSign].skillDisadvantages?.map(camelToTitleCase).join(', ')}
				</div>
			{/if}
		</div>
	</section>

	<!-- Spirit Points & Complications -->
	<section class="card p-4 variant-soft-secondary">
		<h3 class="h4 font-bold mb-3 text-secondary-700 dark:text-secondary-300">Spirit & Wounds</h3>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			<!-- Spirit Points -->
			<div>
				<h4 class="font-semibold text-sm mb-2">Spirit Points</h4>
				<div class="flex items-center gap-2">
					<div class="flex gap-1">
						{#each Array(maxSpiritPoints) as _, i}
							<div
								class="w-6 h-6 rounded-full flex items-center justify-center {i < player.spiritPoints ? 'bg-secondary-500' : 'bg-surface-500/30'}"
							>
								{#if i < player.spiritPoints}
									<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24">
										<path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
									</svg>
								{/if}
							</div>
						{/each}
					</div>
					<span class="text-sm">{player.spiritPoints} / {maxSpiritPoints}</span>
				</div>
				<p class="text-xs opacity-75 mt-1">
					Recover 1 after a full night's rest in comfort.
				</p>
			</div>

			<!-- Complications -->
			<div>
				<h4 class="font-semibold text-sm mb-2">Active Complications</h4>
				{#if editMode}
					<ComplicationsDisplay
						complications={player.complications}
						equipment={player.equipment}
						onHeal={(id) => {
							if (onUpdate) {
								onUpdate({
									...player,
									complications: player.complications.filter(c => c.id !== id)
								})
							}
						}}
					/>
				{:else}
					<ComplicationsDisplay
						complications={player.complications}
						equipment={player.equipment}
					/>
				{/if}
			</div>
		</div>
	</section>

	<!-- Notes Section -->
	<section class="card p-4 variant-soft-surface">
		<h3 class="h4 font-bold mb-3">Notes</h3>
		{#if editMode}
			<textarea
				class="textarea w-full h-32"
				placeholder="Add notes about your character, backstory, or session details..."
				value={player.notes}
				oninput={(e) => updateNotes(e.currentTarget.value)}
			></textarea>
		{:else if player.notes}
			<p class="whitespace-pre-wrap text-surface-600-300-token">{player.notes}</p>
		{:else}
			<p class="text-surface-500 italic">No notes yet</p>
		{/if}
	</section>

	<!-- Skill Roll Modal -->
	{#if showSkillRollModal && selectedSkill}
		<div class="fixed inset-0 bg-surface-backdrop-token z-50 flex items-center justify-center p-4">
			<SkillRollModal
				{player}
				skill={selectedSkill}
				onClose={closeSkillRoll}
			/>
		</div>
	{/if}

	<!-- Level Up Wizard Modal -->
	{#if showLevelUpWizard}
		<div class="fixed inset-0 bg-surface-backdrop-token z-50 flex items-center justify-center p-4">
			<LevelUpWizard
				{player}
				onComplete={handleLevelUpComplete}
				onCancel={closeLevelUpWizard}
			/>
		</div>
	{/if}
</div>

<style>
	/* Print-friendly styles */
	@media print {
		.character-sheet {
			font-size: 10pt;
			color: black !important;
			background: white !important;
		}

		.card {
			break-inside: avoid;
			border: 1px solid #ccc !important;
			box-shadow: none !important;
			background: white !important;
		}

		.badge {
			border: 1px solid currentColor;
			background: transparent !important;
		}

		/* Hide print button and edit elements */
		button,
		input[type='number'],
		textarea {
			display: none;
		}

		/* Show values instead of inputs */
		.print\:hidden {
			display: none !important;
		}

		/* Ensure progress bars print nicely */
		:global(.progress-bar) {
			border: 1px solid #ccc;
		}
	}
</style>
