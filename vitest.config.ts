import { defineConfig } from 'vitest/config'
import { sveltekit } from '@sveltejs/kit/vite'

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		environment: 'jsdom',
		globals: true,
		setupFiles: ['./vitest-setup.ts'],
		alias: {
			// Force Svelte to use the browser version for component testing
			svelte: 'svelte',
		},
		server: {
			deps: {
				// Inline skeleton to avoid CSS preprocessing issues
				inline: ['@skeletonlabs/skeleton']
			}
		}
	},
	resolve: {
		conditions: ['browser'],
	},
})
