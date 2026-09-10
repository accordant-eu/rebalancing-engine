import { closeDb } from '../src/db/sqlite';

jest.setTimeout(15000);

afterAll(() => {
  try {
    closeDb();
  } catch (_e) {
    // Ignore
  }
});

