import { AsyncLocalStorage } from 'async_hooks'

/**
 * Stores the current request's security unit.
 * - undefined  → no authentication context (unauthenticated requests)
 * - null       → ADMIN user (no row-level filter applied)
 * - string     → regular user's securityUnit (used as filter)
 */
export const securityStorage = new AsyncLocalStorage<string | null>()
