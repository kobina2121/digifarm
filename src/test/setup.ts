import { config } from "dotenv";

config({ quiet: true });

// Point the app's database client at the test database for every test file.
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
process.env.APP_URL ??= "http://localhost:3000";
process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
process.env.BETTER_AUTH_SECRET ??= "test-secret-test-secret-test-secret-00";
process.env.EMAIL_FROM ??= "DigiFarm <no-reply@digifarm.local>";
// Keep files written by tests away from development uploads.
process.env.STORAGE_LOCAL_DIR = ".storage/test";

export const hasTestDatabase = Boolean(process.env.TEST_DATABASE_URL);
