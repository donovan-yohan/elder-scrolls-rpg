<script lang="ts">
	import classNames from 'classnames'

	interface Props {
		name: string
		cost: string
		icon: string
		color: 'primary' | 'error' | 'success'
		disabled: boolean
		onclick: () => void
	}

	let { name, cost, icon, color, disabled, onclick }: Props = $props()

	const iconMap: Record<string, string> = {
		boot: '🥾',
		sword: '⚔️',
		shield: '🛡️',
		pouch: '🎒',
		magic: '✨',
		crosshair: '🎯',
		running: '🏃',
		aura: '🔮'
	}
</script>

<button
	type="button"
	class={classNames(
		'card p-4 flex flex-col items-center gap-2 transition-all cursor-pointer min-w-[100px]',
		`variant-soft-${color}`,
		{
			'opacity-50': disabled,
			'hover:brightness-110': !disabled
		}
	)}
	onclick={onclick}
>
	<span class="text-2xl">{iconMap[icon] ?? '❓'}</span>
	<span class="font-semibold text-sm">{name}</span>
	<span class="badge variant-filled text-xs">{cost}</span>
</button>
