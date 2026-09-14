export const GENERATION_PROFILE_IDS = Object.freeze({
  ORIGIN: 'origin',
  ABYSSAL: 'abyssal',
});

const ORIGIN = Object.freeze({
  id: GENERATION_PROFILE_IDS.ORIGIN,
  label: 'Origin — scientific baseline',
  seedPrefix: 'SYS',
  planetCount: null,
  guaranteedComets: null,
  guaranteedRoguePlanet: false,
  compactCompanion: null,
  phenomenonOptions: null,
  anomalyOptions: null,
  mobileVisualParticleBudget: 40_000,
  scientificStatus: 'Standard seeded near-Keplerian planetary system with the established physical and presentation layers.',
});

const ABYSSAL = Object.freeze({
  id: GENERATION_PROFILE_IDS.ABYSSAL,
  label: 'Abyssal — extreme universe',
  seedPrefix: 'ABYSSAL',
  planetCount: 9,
  guaranteedComets: 2,
  guaranteedRoguePlanet: true,
  compactCompanion: Object.freeze({
    type: 'magnetar',
    name: 'Abyssal Sentinel',
    solarMasses: 1.55,
    separationAu: 420,
    spinPeriodSeconds: 4.8,
    magneticFieldTesla: 5e10,
  }),
  phenomenonOptions: Object.freeze({ asteroidBeltCount: 2, remnantCount: 2, ringLimit: 4 }),
  anomalyOptions: Object.freeze({ minimum: 15, maximum: 18 }),
  mobileVisualParticleBudget: 40_000,
  scientificStatus: 'Extreme but bounded profile: a dense planetary system and wide physical magnetar companion use live Newtonian gravity; enhanced remnants, belts and anomalies remain explicitly labeled presentation layers.',
});

export const GENERATION_PROFILES = Object.freeze({
  [ORIGIN.id]: ORIGIN,
  [ABYSSAL.id]: ABYSSAL,
});

export function resolveGenerationProfile(profileId = GENERATION_PROFILE_IDS.ORIGIN) {
  const normalized = String(profileId || GENERATION_PROFILE_IDS.ORIGIN).trim().toLowerCase();
  return GENERATION_PROFILES[normalized] ?? ORIGIN;
}
