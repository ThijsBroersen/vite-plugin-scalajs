import { vi } from 'vitest';

if (!process.env.DEBUG) {
  vi.spyOn(console, 'debug').mockImplementation(() => {});
}
