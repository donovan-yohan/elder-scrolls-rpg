<script lang="ts">
	import { Accordion, AccordionItem, ProgressBar, getToastStore } from '@skeletonlabs/skeleton'
	import type { PlayerData } from '$lib/models/player'
	import { type Skill } from '$lib/data/skill'
	import { Archetypes } from '$lib/data/archetype'
	import { BirthSigns } from '$lib/data/birthSign'
	import { Race, RaceName } from '$lib/data/race'
	import { Level } from '$lib/data/level'
	import {
		calculateMaxHealth,
		calculateMaxMagicka,
		calculateMaxAP,
		calculateSkillBonus,
		RacialStatBonuses,
		getStatBreakdown,
	} from '$lib/util/stats.util'
	import { camelToTitleCase } from '$lib/util/string.util'
	import { getSpellById, SpellSchool, type Spell } from '$lib/data/spells'
	import { getWeaponById } from '$lib/data/weapons'
	import { ArmorTypes } from '$lib/data/armor'
	import { getItemById } from '$lib/data/items'
	import { exportCharacter } from '$lib/util/export.util'

	export let player: PlayerData
	export let editMode: boolean = false
	export let onUpdate: ((player: PlayerData) => void) | undefined = undefined

	const toastStore = getToastStore()

	// Computed stats
	$: maxHealth = calculateMaxHealth(player)
	$: maxMagicka = calculateMaxMagicka(player)
	$: maxAP = calculateMaxAP(player)
	$: levelData = Level[player.level] ?? Level[1]!

	// Stat breakdowns using shared utility
	$: healthBreakdown = getStatBreakdown(player, 'health')
	$: magickaBreakdown = getStatBreakdown(player, 'magicka')
	$: apBreakdown = getStatBreakdown(player, 'actionPoints')

	// Skills grouped by type
	$: majorSkillsWithBonus = player.majorSkills.map((skill) => ({
		skill,
		bonus: calculateSkillBonus(player, skill),
		subskills: player.subSkills.filter((sub) => sub.parentSkill === skill),
	}))

	$: minorSkillsWithBonus = player.minorSkills.map((skill) => ({
		skill,
		bonus: calculateSkillBonus(player, skill),
		subskills: player.subSkills.filter((sub) => sub.parentSkill === skill),
	}))

	// Spells grouped by school
	$: spellsBySchool = player.knownSpells.reduce(
		(acc, spellId) => {
			const spell = getSpellById(spellId)
			if (spell) {
				if (!acc[spell.school]) acc[spell.school] = []
				acc[spell.school].push(spell)
			}
			return acc
		},
		{} as Record<SpellSchool, Spell[]>,
	)

	$: hasSpells = player.knownSpells.length > 0

	// Equipment helpers
	$: equippedWeapon = player.equipment.weapon ? getWeaponById(player.equipment.weapon) : null
	$: equippedOffhand = player.equipment.offhand ? getWeaponById(player.equipment.offhand) : null
	$: equippedArmor = player.equipment.armor
		? ArmorTypes.find((a) => a.id === player.equipment.armor)
		: null

	// Inventory items
	$: inventoryItems = player.inventory
		.map((inv) => ({
			item: getItemById(inv.itemId),
			quantity: inv.quantity,
		}))
		.filter((i) => i.item !== undefined)

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

	function handlePrint() {
		window.print()
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
							on:change={(e) => updateLevel(parseInt(e.currentTarget.value) || 1)}
						/>
					{:else}
						Level {player.level}
					{/if}
				</span>
				<span class="badge variant-soft-tertiary text-base px-3 py-1.5">{player.race}</span>
				<span class="badge variant-soft-secondary text-base px-3 py-1.5">{player.archetype}</span>
				<span class="badge variant-soft-warning text-base px-3 py-1.5">{player.birthSign}</span>
			</div>
		</div>
		<div class="mt-4 flex gap-2 print:hidden">
			<button class="btn btn-sm variant-ghost-surface" on:click={handlePrint}>
				<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
				</svg>
				Print Character Sheet
			</button>
			<button class="btn btn-sm variant-ghost-surface" on:click={handleExport}>
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
							max={maxHealth}
							value={player.health}
							on:change={(e) => updateCurrentStat('health', parseInt(e.currentTarget.value) || 0)}
						/>
						<span class="text-xl font-bold">/ {maxHealth}</span>
					{:else}
						<span class="text-2xl font-bold">{player.health} / {maxHealth}</span>
					{/if}
				</div>
			</div>
			<ProgressBar
				value={player.health}
				max={maxHealth}
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
							max={maxMagicka}
							value={player.magicka}
							on:change={(e) => updateCurrentStat('magicka', parseInt(e.currentTarget.value) || 0)}
						/>
						<span class="text-xl font-bold">/ {maxMagicka}</span>
					{:else}
						<span class="text-2xl font-bold">{player.magicka} / {maxMagicka}</span>
					{/if}
				</div>
			</div>
			<ProgressBar
				value={player.magicka}
				max={maxMagicka}
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
							max={maxAP}
							value={player.actionPoints}
							on:change={(e) => updateCurrentStat('actionPoints', parseInt(e.currentTarget.value) || 0)}
						/>
						<span class="text-xl font-bold">/ {maxAP}</span>
					{:else}
						<span class="text-2xl font-bold">{player.actionPoints} / {maxAP}</span>
					{/if}
				</div>
			</div>
			<ProgressBar
				value={player.actionPoints}
				max={maxAP}
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

	<!-- Skills Section -->
	<section class="grid grid-cols-1 md:grid-cols-2 gap-4">
		<!-- Major Skills -->
		<div class="card p-4 variant-soft-primary">
			<h3 class="h4 font-bold mb-3 text-primary-700 dark:text-primary-300">
				Major Skills
				<span class="text-sm font-normal text-surface-600-300-token">(+{levelData.majorSkillBonus} base)</span>
			</h3>
			{#if majorSkillsWithBonus.length > 0}
				<div class="space-y-2">
					{#each majorSkillsWithBonus as { skill, bonus, subskills }}
						<div class="flex flex-col">
							<div class="flex justify-between items-center py-1 border-b border-surface-300-600-token">
								<span class="font-medium">{camelToTitleCase(skill)}</span>
								<span class="badge variant-filled-primary">+{bonus}</span>
							</div>
							{#if subskills.length > 0}
								<div class="pl-4 mt-1 space-y-1">
									{#each subskills as subskill}
										<div class="flex justify-between items-center text-sm text-surface-600-300-token">
											<span>{subskill.name}</span>
											<span class="badge variant-soft-success text-xs">+1</span>
										</div>
									{/each}
								</div>
							{/if}
						</div>
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
				<span class="text-sm font-normal text-surface-600-300-token">(+{levelData.minorSkillBonus} base)</span>
			</h3>
			{#if minorSkillsWithBonus.length > 0}
				<div class="space-y-2">
					{#each minorSkillsWithBonus as { skill, bonus, subskills }}
						<div class="flex flex-col">
							<div class="flex justify-between items-center py-1 border-b border-surface-300-600-token">
								<span class="font-medium">{camelToTitleCase(skill)}</span>
								<span class="badge variant-filled-secondary">+{bonus}</span>
							</div>
							{#if subskills.length > 0}
								<div class="pl-4 mt-1 space-y-1">
									{#each subskills as subskill}
										<div class="flex justify-between items-center text-sm text-surface-600-300-token">
											<span>{subskill.name}</span>
											<span class="badge variant-soft-success text-xs">+1</span>
										</div>
									{/each}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{:else}
				<p class="text-surface-500">No minor skills selected</p>
			{/if}
		</div>
	</section>

	<!-- Spells Section -->
	{#if hasSpells}
		<section class="card p-4 variant-soft-tertiary">
			<h3 class="h4 font-bold mb-3 text-tertiary-700 dark:text-tertiary-300">Spells</h3>
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
		</section>
	{/if}

	<!-- Equipment Section -->
	<section class="card p-4 variant-soft-surface">
		<h3 class="h4 font-bold mb-3">Equipment</h3>
		<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
			<!-- Weapon -->
			<div class="card p-3 variant-ghost-surface">
				<h4 class="font-semibold text-sm text-surface-600-300-token mb-2">Weapon</h4>
				{#if equippedWeapon}
					<div class="font-bold">{equippedWeapon.name}</div>
					<div class="text-sm space-y-1 mt-2">
						<div class="flex justify-between">
							<span>Damage:</span>
							<span>{equippedWeapon.baseDamageLethal ?? equippedWeapon.baseDamageBlunted}</span>
						</div>
						<div class="flex justify-between">
							<span>AP Cost:</span>
							<span>{equippedWeapon.apCost}</span>
						</div>
						<div class="flex justify-between">
							<span>Range:</span>
							<span>{equippedWeapon.range}</span>
						</div>
						{#if equippedWeapon.maxBonusDamage > 0}
							<div class="flex justify-between">
								<span>Max Bonus Dmg:</span>
								<span>+{equippedWeapon.maxBonusDamage}</span>
							</div>
						{/if}
					</div>
				{:else}
					<span class="text-surface-500">Unarmed</span>
				{/if}
			</div>

			<!-- Offhand -->
			<div class="card p-3 variant-ghost-surface">
				<h4 class="font-semibold text-sm text-surface-600-300-token mb-2">Off-Hand</h4>
				{#if equippedOffhand}
					<div class="font-bold">{equippedOffhand.name}</div>
					<div class="text-sm space-y-1 mt-2">
						{#if equippedOffhand.isShield}
							<div class="flex justify-between">
								<span>Block Bonus:</span>
								<span>+{equippedOffhand.baseDamageBlunted}</span>
							</div>
						{:else}
							<div class="flex justify-between">
								<span>Damage:</span>
								<span>{equippedOffhand.baseDamageLethal ?? equippedOffhand.baseDamageBlunted}</span>
							</div>
						{/if}
						<div class="flex justify-between">
							<span>AP Cost:</span>
							<span>{equippedOffhand.apCost}</span>
						</div>
					</div>
				{:else}
					<span class="text-surface-500">Empty</span>
				{/if}
			</div>

			<!-- Armor -->
			<div class="card p-3 variant-ghost-surface">
				<h4 class="font-semibold text-sm text-surface-600-300-token mb-2">Armor</h4>
				{#if equippedArmor}
					<div class="font-bold">{equippedArmor.name}</div>
					<div class="text-sm space-y-1 mt-2">
						<div class="flex justify-between">
							<span>AC Bonus:</span>
							<span>+{equippedArmor.acBonus}</span>
						</div>
						<div class="flex justify-between">
							<span>Dodge Bonus:</span>
							<span class={equippedArmor.dodgeBonus < 0 ? 'text-error-500' : ''}>
								{equippedArmor.dodgeBonus >= 0 ? '+' : ''}{equippedArmor.dodgeBonus}
							</span>
						</div>
						{#if equippedArmor.magickaCastModifier !== 'none'}
							<div class="flex justify-between">
								<span>Spellcasting:</span>
								<span class="capitalize">{equippedArmor.magickaCastModifier}</span>
							</div>
						{/if}
					</div>
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
	</section>

	<!-- Inventory Section -->
	{#if inventoryItems.length > 0}
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

	<!-- Notes Section -->
	<section class="card p-4 variant-soft-surface">
		<h3 class="h4 font-bold mb-3">Notes</h3>
		{#if editMode}
			<textarea
				class="textarea w-full h-32"
				placeholder="Add notes about your character, backstory, or session details..."
				value={player.notes}
				on:input={(e) => updateNotes(e.currentTarget.value)}
			></textarea>
		{:else if player.notes}
			<p class="whitespace-pre-wrap text-surface-600-300-token">{player.notes}</p>
		{:else}
			<p class="text-surface-500 italic">No notes yet</p>
		{/if}
	</section>
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
