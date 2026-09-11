import { BODY_KIND } from './constants.js';
import { bulkDensityKgM3 } from '../physics/planetaryProperties.js';

const ROTATION_SCALARS = Object.freeze([
  'rotationPeriodSeconds',
  'rotationDirection',
  'rotationPhaseRad',
  'rotationEpochSeconds',
  'axialTiltRad',
  'rotationModel',
]);

function missing(value) {
  return value === undefined || value === null;
}

function finiteAxis(axis) {
  return axis?.length >= 3
    && Number.isFinite(Number(axis[0]))
    && Number.isFinite(Number(axis[1]))
    && Number.isFinite(Number(axis[2]));
}

/**
 * Merge deterministic generated metadata into a serialized body without replacing
 * authoritative saved dynamics or an already-saved rotation frame.
 *
 * Existing v1 body-fixed landing anchors depend on their original rotation basis, so a
 * generator upgrade must only backfill rotation fields that were genuinely absent.
 */
export function applyGeneratedBodyCompatibility(restored, generated) {
  if (!restored || !generated) return restored;

  for (const key of ROTATION_SCALARS) {
    if (missing(restored[key]) && !missing(generated[key])) restored[key] = generated[key];
  }
  if (!finiteAxis(restored.rotationAxisInertial) && finiteAxis(generated.rotationAxisInertial)) {
    restored.rotationAxisInertial = [...generated.rotationAxisInertial];
  }

  if (missing(restored.physicalPropertyModel)) {
    if (restored.kind === BODY_KIND.PLANET && restored.planetType === 'gas') {
      // Legacy saves keep their serialized mass/radius so orbital state, collisions and moon
      // geometry do not jump. Density is safe to re-derive because it is a dependent property.
      const derivedDensity = bulkDensityKgM3(restored.mass, restored.radius);
      if (Number.isFinite(derivedDensity) && derivedDensity > 0) restored.densityKgM3 = derivedDensity;
      restored.physicalPropertyModel = 'legacy-gas-geometry-preserved-v1';
    } else if (!missing(generated.physicalPropertyModel)) {
      restored.physicalPropertyModel = generated.physicalPropertyModel;
    }
  }

  if (missing(restored.environmentModelVersion) && !missing(generated.environmentModelVersion)) {
    restored.environmentModelVersion = generated.environmentModelVersion;
  }
  if (missing(restored.environmentFormationModel) && !missing(generated.environmentFormationModel)) {
    restored.environmentFormationModel = generated.environmentFormationModel;
  }
  if ((!restored.environmentFormation || typeof restored.environmentFormation !== 'object')
    && generated.environmentFormation && typeof generated.environmentFormation === 'object') {
    restored.environmentFormation = { ...generated.environmentFormation };
  }

  if (missing(restored.rogueOrbitModel) && !missing(generated.rogueOrbitModel)) {
    // Do not rewrite a legacy rogue velocity; the saved dynamical state remains authoritative.
    restored.rogueOrbitModel = 'legacy-saved-orbit-preserved-v1';
  }

  return restored;
}
