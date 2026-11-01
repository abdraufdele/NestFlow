import { openDB } from 'idb';
export interface Preferences { preference: string; days: string }
const defaults: Preferences = { preference: '0', days: '30' };
const database = () => openDB('nestflow-preferences', 1, { upgrade(db) { db.createObjectStore('planning'); } });
export async function loadPreferences(): Promise<Preferences> {
  const db = await database();
  try { return await db.get('planning', 'inputs') ?? { ...defaults }; } finally { db.close(); }
}
let mutations: Promise<void> = Promise.resolve();
function mutate(task: () => Promise<void>) {
  mutations = mutations.catch(() => {}).then(task);
  return mutations;
}
export function savePreferences(value: Preferences) {
  // Copy immediately and whitelist only the two inputs.
  const planning = { preference: value.preference, days: value.days };
  return mutate(async () => {
    const db = await database();
    try { await db.put('planning', planning, 'inputs'); } finally { db.close(); }
  });
}
export function resetPreferences() {
  return mutate(async () => {
    const db = await database();
    try { await db.clear('planning'); } finally { db.close(); }
  });
}
