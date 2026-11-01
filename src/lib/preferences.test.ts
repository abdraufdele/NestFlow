import 'fake-indexeddb/auto';
import { openDB } from 'idb';
import { expect, it } from 'vitest';
import { loadPreferences, savePreferences, resetPreferences } from './preferences';
it('persists only planning inputs and resets explicitly', async () => {
  await resetPreferences();
  expect(await loadPreferences()).toEqual({ preference: '0', days: '30' });
  await savePreferences({ preference: '12.345678', days: '90' });
  expect(await loadPreferences()).toEqual({ preference: '12.345678', days: '90' });
  await resetPreferences();
  expect(await loadPreferences()).toEqual({ preference: '0', days: '30' });
});

it('a reset follows outstanding saves instead of restoring old inputs', async () => {
  await Promise.all([savePreferences({ preference: '42', days: '70' }), resetPreferences()]);
  expect(await loadPreferences()).toEqual({ preference: '0', days: '30' });
});

it('whitelists the two planning strings and never writes an address', async () => {
  await savePreferences({ preference: '12', days: '45', account: '0x1111111111111111111111111111111111111111' } as { preference: string; days: string });
  const db = await openDB('nestflow-preferences');
  try { expect(await db.get('planning', 'inputs')).toEqual({ preference: '12', days: '45' }); } finally { db.close(); }
});
