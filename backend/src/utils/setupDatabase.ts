import { PrismaClient } from '@prisma/client'

/**
 * Tables that carry a securityUnit column and must be protected by RLS.
 */
const SECURED_TABLES = ['Item', 'Reception', 'Distribution', 'Entity', 'Vehicle', 'Budget', 'Log'] as const

/**
 * Runs once at backend startup (using the admin/postgres connection) to:
 *  1. Create the limited `app_user` role used for runtime queries.
 *  2. Grant it the minimum required privileges.
 *  3. Enable PostgreSQL Row Level Security on all secured tables.
 *  4. Create/replace a policy that filters rows by the `app.security_unit`
 *     GUC variable set at the beginning of each request.
 *
 * All statements are idempotent — safe to run on every container restart.
 */
export async function setupDatabase(): Promise<void> {
  // Use the admin connection (DATABASE_URL = postgres superuser) for setup
  const admin = new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL } },
  })

  try {
    console.log('🔧  Running database security setup...')

    // ── 1. Create limited app_user role ──────────────────────────────────────
    const appUserPassword = process.env.APP_DB_PASSWORD || 'app_secure_2024'
    
    if (process.env.NODE_ENV === 'production' && !process.env.APP_DB_PASSWORD) {
      throw new Error('CRITICAL: APP_DB_PASSWORD must be set to a strong password in production environment')
    }
    
    // Escape single quotes in password for SQL
    const escapedPassword = appUserPassword.replace(/'/g, "''")
    
    await admin.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_user') THEN
          CREATE ROLE app_user LOGIN PASSWORD '${escapedPassword}';
        ELSE
          ALTER ROLE app_user WITH PASSWORD '${escapedPassword}';
        END IF;
      END
      $$
    `)

    // ── 2. Grant runtime privileges to app_user ───────────────────────────────
    await admin.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO app_user`)
    await admin.$executeRawUnsafe(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user`)
    await admin.$executeRawUnsafe(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user`)
    // Cover tables created in future migrations
    await admin.$executeRawUnsafe(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user`)
    await admin.$executeRawUnsafe(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app_user`)

    // ── 3. Enable RLS + FORCE on each secured table ───────────────────────────
    for (const table of SECURED_TABLES) {
      await admin.$executeRawUnsafe(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`)
      // FORCE makes the policy apply to the table owner as well (not just app_user)
      await admin.$executeRawUnsafe(`ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY`)

      // ── 4. Create/replace the permissive policy ─────────────────────────────
      // RLS policy logic (applied when connecting as app_user):
      //   ● GUC not set / empty string → DEFAULT DENY (no rows visible)
      //     → protects against accidental direct connections that forget to set the GUC
      //   ● GUC = 'ADMIN'             → all rows visible (ADMIN bypass)
      //   ● GUC = <unit name>         → only rows with matching securityUnit
      //     (rows with securityUnit IS NULL are treated as global and visible to all units)
      await admin.$executeRawUnsafe(`DROP POLICY IF EXISTS security_unit_policy ON "${table}"`)
      await admin.$executeRawUnsafe(`
        CREATE POLICY security_unit_policy ON "${table}"
          AS PERMISSIVE
          FOR ALL
          TO app_user
          USING (
            current_setting('app.security_unit', true) = 'ADMIN'
            OR (
              current_setting('app.security_unit', true) IS NOT NULL
              AND current_setting('app.security_unit', true) <> ''
              AND (
                "securityUnit" IS NULL
                OR "securityUnit" = current_setting('app.security_unit', true)
              )
            )
          )
          WITH CHECK (
            current_setting('app.security_unit', true) = 'ADMIN'
            OR "securityUnit" = current_setting('app.security_unit', true)
          )
      `)
    }

    console.log('✅  Database security setup complete (RLS enabled on', SECURED_TABLES.length, 'tables)')
  } finally {
    await admin.$disconnect()
  }
}
