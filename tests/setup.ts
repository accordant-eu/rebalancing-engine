import { closeDb } from '../src/db/sqlite';

afterAll(() => {
  try {
    closeDb();
  } catch (e) {
    // Ignore
  }
});
