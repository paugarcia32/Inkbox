import 'reflect-metadata';

if (!process.env.DATABASE_URL?.includes('test')) {
  throw new Error(
    'DATABASE_URL does not point to a test database — aborting to prevent data loss.',
  );
}

process.env.NODE_ENV = 'test';
