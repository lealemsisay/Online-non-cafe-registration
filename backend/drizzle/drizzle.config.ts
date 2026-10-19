import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle',
  schema: './backend/drizzle/schema.js',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
  // These options will help generate migrations that match existing DB
  casing: 'snake_case',
  strict: true,
});