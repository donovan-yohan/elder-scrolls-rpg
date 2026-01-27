# Elder Scrolls RPG - Claude Code Instructions

## Svelte 5 Migration

This project is migrating to Svelte 5. **Prefer Svelte 5 syntax wherever possible:**

- Use `$state()` instead of `let variable = value`
- Use `$derived()` instead of `$: derived = expression`
- Use `$effect()` instead of `$: { side effects }`
- Use `$props()` with interface instead of `export let`
- Use callback props (`onstart`, `onclick`) instead of `createEventDispatcher`
- Use `onclick={handler}` instead of `on:click={handler}` in templates

### Example Svelte 5 Component

```svelte
<script lang="ts">
  interface Props {
    value: string
    onchange?: (newValue: string) => void
  }

  let { value, onchange }: Props = $props()

  let count = $state(0)
  let doubled = $derived(count * 2)

  $effect(() => {
    console.log('count changed:', count)
  })
</script>

<button onclick={() => count++}>
  {count} (doubled: {doubled})
</button>
```
