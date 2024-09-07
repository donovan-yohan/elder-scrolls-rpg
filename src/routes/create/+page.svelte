<script lang="ts">
	import SuperDebug, { superForm } from 'sveltekit-superforms';
	import { Accordion, AccordionItem, RadioGroup, RadioItem } from '@skeletonlabs/skeleton';
	import { ArchetypeName, Archetypes } from '$lib/data/archetype';
	import { BirthSignName, BirthSigns } from '$lib/data/birthSign';
	import { camelToTitleCase } from '$lib/util/string.util';
	import { Race, RaceName } from '$lib/data/race';
	import { Skill, SkillLevel } from '$lib/data/skill';
	import classNames from 'classnames';
	import { playersStore } from '$lib/stores/persisted.store';
	import type { Player } from '$lib/models/player';
	import { goto } from '$app/navigation';

	export let data;

	let skillGroups = Object.values(Skill).reduce((acc, skill) => {
		acc[skill] = SkillLevel.Untrained;
		return acc;
	}, {} as Record<Skill, SkillLevel>);

	$: {
		$form.majorSkills = Object.entries(skillGroups).filter((obj) => obj[1] === SkillLevel.Major).map((obj) => Skill[obj[0] as keyof typeof Skill]);
		$form.minorSkills = Object.entries(skillGroups).filter((obj) => obj[1] === SkillLevel.Minor).map((obj) => Skill[obj[0] as keyof typeof Skill]);
	}

	const { form, enhance, errors, message } = superForm<Record<string, unknown>, Player>(data.form, { dataType: 'json' });

	$: {
		const newPlayer = $message;
		if (newPlayer !== undefined) {
			playersStore.update((players) => {
				players[newPlayer.characterName] = newPlayer;
				return players;
			});
			goto('/')
		}
	}
</script>

<div class="container mx-auto">
	<form use:enhance method="POST" class="flex flex-col gap-8">
		<label class="label">
			<span>Character Name</span>
			<input class="input" type="text" placeholder="John Scrolls" bind:value={$form.characterName}/>
			{#if $errors.characterName}<span class="input-error">{$errors.characterName}</span>{/if}
		</label>
		<div class="label flex flex-col">
			<span>Race</span>
			<Accordion>
				{#each Object.values(RaceName) as race}
					<AccordionItem>
						<svelte:fragment slot="summary">
							<span class="text-lg flex items-center space-x-2">
								<input class="radio" type="radio" bind:group={$form.race} name={race} value={RaceName[race]} on:click|stopPropagation  />
								<span>{race}</span>
							</span>
						</svelte:fragment>
						<svelte:fragment slot="content">
							<div class="bg-surface-700">
								{#each Race[race].description.split('\n') as line}
									<p>{line}</p>
								{/each}
							</div>
						</svelte:fragment>
					</AccordionItem>
				{/each}
			</Accordion>
		</div>
		<div class="label flex flex-col">
			<span>Archetype</span>
			<RadioGroup>
				{#each Object.values(ArchetypeName) as archetype}
					<RadioItem bind:group={$form.archetype} name={archetype} value={ArchetypeName[archetype]}>{archetype}</RadioItem>
				{/each}
			</RadioGroup>
		</div>
		{#if $form.archetype}
			 <div class="flex">
					<div class="min-w-[33%] flex flex-col">
						<span>High Stat</span>
						<span>{camelToTitleCase(Archetypes[$form.archetype].highStat)}</span>
					</div>
				 <div class="min-w-[33%] flex flex-col">
					 <span>Medium Stat</span>
					 <span>{camelToTitleCase(Archetypes[$form.archetype].mediumStat)}</span>
				 </div>
				 <div class="min-w-[33%] flex flex-col">
					 <span>Low Stat</span>
					 <span>{camelToTitleCase(Archetypes[$form.archetype].lowStat)}</span>
				 </div>
			 </div>
		{/if}
		<div class="label flex flex-col">
			<span>Birth Sign</span>
			<Accordion>
				{#each Object.values(BirthSignName) as sign}
					<AccordionItem>
						<svelte:fragment slot="summary">
							<span class="text-lg flex items-center space-x-2">
								<input class="radio" type="radio" bind:group={$form.birthSign} name={sign} value={BirthSignName[sign]} on:click|stopPropagation  />
								<span>{sign}</span>
							</span>
						</svelte:fragment>
						<svelte:fragment slot="content">
							<div class="bg-surface-700 flex flex-col gap-4">
								{#each Object.entries(BirthSigns[sign]) as [key, value]}
									<div class="flex">
										<span class="font-bold min-w-[25%]">{camelToTitleCase(key)}</span>
										<span class="shrink">{value}</span>
									</div>
								{/each}
							</div>
						</svelte:fragment>
					</AccordionItem>
				{/each}
			</Accordion>
		</div>
		<div class="label flex flex-col">
			<span>Skills</span>
			<span>Choose {6 - $form.majorSkills.length} Major Skills and {6 - $form.minorSkills.length} Minor Skills</span>
			{#if $errors.majorSkills}<span class="input-error">Major Skills Error: {$errors.majorSkills._errors}</span>{/if}
			{#if $errors.minorSkills}<span class="input-error">Minor Skills Error: {$errors.minorSkills._errors}</span>{/if}
			<div class="flex flex-wrap gap-8">
				{#each Object.values(Skill) as skill}
					<div class="flex flex-col gap-2 w-1/6">
						<span class={classNames(
							'text-xl',
							{ 'text-primary-400 font-bold': $form.majorSkills.includes(skill) },
							{ 'text-secondary-400 font-bold': $form.minorSkills.includes(skill) },
						)}>{skill}</span>
						<label class="label">
							<input class="peer radio" type="radio" bind:group={skillGroups[skill]} value={SkillLevel.Major} disabled={$form.majorSkills.length >= 6} />
							<span class="peer-disabled:text-surface-700">Major</span>
						</label>
						<label class="label">
							<input class="peer radio" type="radio" bind:group={skillGroups[skill]}  value={SkillLevel.Minor} disabled={$form.minorSkills.length >= 6}  />
							<span class="peer-disabled:text-surface-700">Minor</span>
						</label>
						<label class="label">
							<input class="peer radio" type="radio" bind:group={skillGroups[skill]}  value={SkillLevel.Untrained} />
							<span class="peer-disabled:text-surface-700">Untrained</span>
						</label>
					</div>
				{/each}
			</div>
		</div>
		<button class="btn variant-filled" type="submit">Create</button>
	</form>

	<SuperDebug data={$form} />
</div>

