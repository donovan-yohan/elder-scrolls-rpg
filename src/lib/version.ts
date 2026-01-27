/**
 * Character schema version - bump this when PlayerData structure changes
 *
 * TODO [v1.0.0]: Replace deletion logic in persisted.store.ts with proper
 * per-character migration functions. Currently we wipe all characters on
 * version mismatch during pre-release development.
 */
export const CHARACTER_SCHEMA_VERSION = '0.1.0'
