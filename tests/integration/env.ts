// Runs before each test file: point Prisma at the test database before anything imports it.
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
