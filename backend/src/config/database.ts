import { PrismaClient } from '@prisma/client'
import { securityStorage } from './securityContext'

// Operations where we inject `where.securityUnit = su` for read-access control
const READ_FILTER_OPS = new Set([
  'findMany', 'findFirst', 'findFirstOrThrow',
  'count', 'aggregate', 'groupBy',
])

// Operations where we inject `where.securityUnit = su` to prevent
// cross-unit updates/deletes even if the caller knows a foreign record's ID
const WRITE_FILTER_OPS = new Set(['update', 'updateMany', 'delete', 'deleteMany'])

/**
 * Builds an $allOperations handler that automatically scopes every Prisma
 * query to the current request's securityUnit (read from AsyncLocalStorage).
 *
 * Storage value:
 *   undefined → no auth context → extension is a no-op (authGuard will reject)
 *   null      → ADMIN → no filter applied
 *   string    → regular user → inject { securityUnit: su } into where clause
 */
function makeSecurityHandler() {
  return {
    async $allOperations({ operation, args, query }: {
      operation: string
      args: any
      query: (a: any) => Promise<any>
    }) {
      const su = securityStorage.getStore()

      if (su !== undefined && su !== null) {
        const suTrimmed = su.trim()
        if (READ_FILTER_OPS.has(operation) || WRITE_FILTER_OPS.has(operation)) {
          args = { ...args, where: { ...(args.where ?? {}), securityUnit: suTrimmed } }
        }
      }

      return query(args)
    },
  }
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      // The application always connects as the postgres superuser so that
      // it is NOT subject to PostgreSQL RLS (superusers bypass RLS).
      // Row-level filtering for regular users is enforced by the Prisma
      // query extension below (application layer).
      // RLS on app_user acts as a secondary guard against direct DB access.
      url: process.env.DATABASE_URL,
    },
  },
}).$extends({
  query: {
    item:         makeSecurityHandler(),
    reception:    makeSecurityHandler(),
    distribution: makeSecurityHandler(),
    entity:       makeSecurityHandler(),
    vehicle:      makeSecurityHandler(),
    budget:       makeSecurityHandler(),
    log:          makeSecurityHandler(),
  },
})

export default prisma

