import { config } from "dotenv";

config({ quiet: true });

// Point the app's database client at the test database for every test file.
// Without one, point it nowhere: .env may hold the real database, and tests
// must never write to it (integration tests skip; see hasTestDatabase).
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://no-test-database@127.0.0.1:1/none";
process.env.APP_URL ??= "http://localhost:3000";
process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
process.env.BETTER_AUTH_SECRET ??= "test-secret-test-secret-test-secret-00";
process.env.EMAIL_FROM ??= "Akuafo <no-reply@digifarm.local>";
// Keep files written by tests away from development uploads.
process.env.STORAGE_LOCAL_DIR = ".storage/test";

export const hasTestDatabase = Boolean(process.env.TEST_DATABASE_URL);
