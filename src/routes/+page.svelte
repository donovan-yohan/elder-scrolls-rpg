<script lang="ts">
	import { playersStore } from '$lib/stores/persisted.store';
	import { defaultPlayer } from '$lib/models/player';
	import { goto } from '$app/navigation';

	let players = Object.values($playersStore)
</script>

<div class="container h-full mx-auto flex justify-center items-center">
	<div class="space-y-10 text-center flex flex-col items-center">
		<h2 class="h2">Welcome to Skyrim RPG.</h2>
		<div class="flex justify-center space-x-2">
			<button
				class="btn variant-filled-secondary"
				on:click={() => {
					const id = crypto.randomUUID()
					playersStore.update((players) => {
						players[id] = {
							id,
							...defaultPlayer,
						}
						return players
					})
					goto(`/${id}`)
				}}
			>
				Create
			</button>
		</div>
		{#each players as player}
			<div class="flex flex-col items-center">
				<a href={`/${player.id}`}>
					<button class="btn variant-filled">{player.characterName}</button>
				</a>
			</div>
		{/each}
	</div>
</div>
