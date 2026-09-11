import test from 'node:test';
import assert from 'node:assert/strict';
import {
  apparentAngularRadiusRad,
  circleOverlapArea,
  diskOccultation,
  dominantOccultationFromPoint,
  illuminatedFractionFromPhaseAngle,
  observerStarOccultation,
  phaseAngleRad,
  phaseAppearance,
  stellarVisibilityAtBody,
} from '../src/core/celestialAppearance.js';

const near = (actual, expected, tolerance = 1e-12) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);

test('apparent angular radius follows finite spherical geometry', () => {
  near(apparentAngularRadiusRad(1, 10), Math.asin(0.1));
  near(apparentAngularRadiusRad(10, 10), Math.PI / 2);
  near(apparentAngularRadiusRad(0, 10), 0);
});

test('phase geometry gives full, quarter, and new illumination at canonical angles', () => {
  const body = [0, 0, 0];
  const star = [10, 0, 0];
  near(phaseAngleRad([20, 0, 0], body, star), 0);
  near(phaseAppearance([20, 0, 0], body, star).illuminatedFraction, 1);
  near(phaseAngleRad([0, 10, 0], body, star), Math.PI / 2);
  near(phaseAppearance([0, 10, 0], body, star).illuminatedFraction, 0.5);
  near(phaseAngleRad([-10, 0, 0], body, star), Math.PI);
  near(phaseAppearance([-10, 0, 0], body, star).illuminatedFraction, 0);
  near(illuminatedFractionFromPhaseAngle(Math.PI / 3), 0.75);
});

test('disk overlap handles none, total cover, and centered smaller foreground', () => {
  near(circleOverlapArea(1, 1, 2), 0);
  near(circleOverlapArea(1, 2, 0), Math.PI);
  const total = diskOccultation({
    backgroundAngularRadiusRad: 1,
    foregroundAngularRadiusRad: 2,
    separationRad: 0,
    backgroundRangeMeters: 100,
    foregroundRangeMeters: 10,
  });
  assert.equal(total.state, 'total');
  near(total.backgroundCoveredFraction, 1);
  const annular = diskOccultation({
    backgroundAngularRadiusRad: 2,
    foregroundAngularRadiusRad: 1,
    separationRad: 0,
    backgroundRangeMeters: 100,
    foregroundRangeMeters: 10,
  });
  assert.equal(annular.state, 'interior');
  near(annular.backgroundCoveredFraction, 0.25);
});

test('object behind a background disk cannot occult it', () => {
  const result = diskOccultation({
    backgroundAngularRadiusRad: 1,
    foregroundAngularRadiusRad: 2,
    separationRad: 0,
    backgroundRangeMeters: 10,
    foregroundRangeMeters: 100,
  });
  assert.equal(result.state, 'none');
  near(result.backgroundCoveredFraction, 0);
});

test('observer eclipse solver finds a foreground moon crossing a finite stellar disk', () => {
  const observer = [0, 0, 0];
  const star = { id: 'star', name: 'Star', radius: 10, position: [0, 0, 1000] };
  const moon = { id: 'moon', name: 'Moon', radius: 2, position: [0, 0, 100] };
  const eclipse = observerStarOccultation(observer, star, [star, moon]);
  assert.equal(eclipse.occulterId, 'moon');
  assert.ok(eclipse.eclipseFraction > 0);
  assert.ok(eclipse.visibleFraction < 1);
});

test('body-centered stellar visibility detects a parent body shadowing a moon', () => {
  const star = { id: 'star', name: 'Star', radius: 10, position: [0, 0, 0] };
  const planet = { id: 'planet', name: 'Planet', radius: 5, position: [100, 0, 0] };
  const moon = { id: 'moon', name: 'Moon', radius: 1, position: [110, 0, 0] };
  const shadow = stellarVisibilityAtBody(moon, star, [star, planet, moon]);
  assert.equal(shadow.occulterId, 'planet');
  assert.ok(shadow.eclipseFraction > 0.99);
});

test('dominant occultation chooses the disk covering the largest fraction of the background', () => {
  const observer = [0, 0, 0];
  const background = { id: 'star', radius: 10, position: [0, 0, 1000] };
  const small = { id: 'small', radius: 0.5, position: [0, 0, 100] };
  const large = { id: 'large', radius: 2, position: [0, 0, 100] };
  const result = dominantOccultationFromPoint(observer, background, [small, large]);
  assert.equal(result.occulterId, 'large');
});
