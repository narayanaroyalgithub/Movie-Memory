import "dotenv/config";

// Point every test worker at the test database and refuse anything that doesn't look like one,
// because DB tests delete rows.
if (process.env.DATABASE_URL_TEST) process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;

if (process.env.DATABASE_URL) {
  const dbName = new URL(process.env.DATABASE_URL).pathname;
  if (!/test/i.test(dbName)) {
    throw new Error(`Refusing to run tests against "${dbName}": database name must contain "test".`);
  }
}
