import { SIMULATION } from './constants.js';

const KEY = 'universe-lab.save.v1';

export class SaveSystem {
  save(payload) {
    const envelope = {
      schemaVersion: SIMULATION.schemaVersion,
      savedAt: new Date().toISOString(),
      payload,
    };
    localStorage.setItem(KEY, JSON.stringify(envelope));
    return envelope;
  }

  load() {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.schemaVersion !== SIMULATION.schemaVersion || !parsed.payload) return null;
      return parsed.payload;
    } catch {
      return null;
    }
  }

  clear() { localStorage.removeItem(KEY); }
}
