<script lang="ts">
	import { playersStore } from '$lib/stores/persisted.store';
</script>
<div class="container h-full mx-auto flex justify-center items-center">
	<div class="space-y-10 text-center flex flex-col items-center">
		<h2 class="h2">Welcome to Skyrim RPG.</h2>
		<!-- / -->
		<div class="flex justify-center space-x-2">
			<a
				class="btn variant-filled"
				href="/create"
			>
				Create
			</a>
		</div>
		<pre>
			{JSON.stringify($playersStore, null, 2)}
		</pre>
	</div>
</div>
