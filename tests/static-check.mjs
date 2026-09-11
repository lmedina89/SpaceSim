import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';

const required = [
  'index.html','styles.css','src/main.js','src/app/app.js','src/core/constants.js','src/data/systemGenerator.js',
  'src/physics/gravity/directGravitySolver.js','src/physics/integrators/velocityVerlet.js','src/physics/orbitalMetrics.js',
  'src/physics/trajectoryPredictor.js','src/physics/planetaryProperties.js','src/physics/planetaryEnvironment.js','src/physics/atmosphericOptics.js','src/physics/shipDynamics.js','src/physics/flightComputer.js','src/physics/transitDrive.js','src/physics/frameOrbitInsertion.js','src/physics/massivePairStepControl.js','src/physics/impactResolver.js',
  'src/experiments/particles/spatialHashGrid.js','src/experiments/particles/particleExperiment.js','src/experiments/particles/particleExperimentManager.js',
  'src/cosmic/phenomenonRegistry.js','src/cosmic/phenomenonGenerator.js','src/cosmic/anomalyGenerator.js','src/cosmic/spaceWeather.js','src/cosmic/scientificOverlays.js','src/render/cosmicPhenomena.js','src/render/spaceWeatherVisuals.js','src/render/scientificOverlayVisuals.js',
  'src/core/astronomicalObserver.js','src/core/celestialAppearance.js','src/core/planetaryRotation.js','src/core/generatedBodyCompatibility.js','src/core/inertialStarCatalog.js','src/navigation/systemNavigation.js','src/navigation/frameGuardRoute.js','src/navigation/observationPlanner.js','src/render/starfield.js','src/render/threeRenderer.js','src/render/backendPolicy.js','src/render/observationCamera.js','src/render/stellarPerception.js','src/render/surfaceWorld.js','src/render/cockpitView.js','src/surface/surfaceGenerator.js','src/surface/surfaceProfiles.js','src/surface/surfaceSession.js','src/surface/surfaceWeather.js','src/surface/landingTransition.js','src/ui/systemMap.js','README.md','ARCHITECTURE.md','SCIENTIFIC-NOTES.md'
];
for (const file of required) await access(new URL(`../${file}`, import.meta.url), constants.R_OK);
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
if (!html.includes('three@0.185.0')) throw new Error('Three.js version is not pinned.');
if (!html.includes('./src/main.js')) throw new Error('Main module missing from shell.');
if (!html.includes('Universe Lab v0.1.5.3.1')) throw new Error('Shell version is not v0.1.5.3.');
if (!html.includes('<div class="brand">UNIVERSE LAB <span>v0.1.5.3.1</span></div>')) throw new Error('Visible top-left build badge is not v0.1.5.3.1.');
if (!html.includes('INPUTREL-1531')) throw new Error('INPUTREL-1531 build marker missing.');
if (pkg.version !== '0.1.5.3.1') throw new Error('package.json version mismatch.');
if (!html.includes('id="warpQuick"')) throw new Error('Quick time-warp control missing.');
if (!html.includes('id="morePanel"')) throw new Error('Flight/System control drawer missing.');
if (!html.includes('id="engineeringPanel"') || !html.includes('id="engineeringClose"')) throw new Error('Dedicated Engineering/Diagnostics drawer missing.');
if (!html.includes('./styles.css?v=1531') || !html.includes('./src/main.js?v=1531')) throw new Error('Build-version cache-busting tags missing.');
if (html.includes('id="moreToggle"')) throw new Error('Redundant bottom MORE launcher must remain removed.');
if (!html.includes('id="cockpitRestore"')) throw new Error('Cockpit restore failsafe missing.');
if (!html.includes('id="approachButton"') || !html.includes('id="matchVelocity"') || !html.includes('id="engineModeButton"')) throw new Error('Scientific flight-computer controls missing.');
if (!html.includes('>BRAKE</button>')) throw new Error('Physical BRAKE control missing.');
for (const id of ['velocityMarker','progradeButton','retrogradeButton','turnBurnButton','transitToggle','transitPanel','transitTargetSource','transitTier','transitEngage','transitArrivalProfile','transitRouteProfile','frameQuick','thrustValue','cockpitOverlay','cockpitStatus','cockpitToggle','ascentDiagnostic']) if (!html.includes(`id="${id}"`)) throw new Error(`Navigation/transit/cockpit control missing: ${id}`);
for (const id of ['particleMode','particleCount','spawnParticleField','fireParticleGun','clearParticleExperiments','particleStatus','experimentSelect','observeExperiment','trackExperiment','orbitExperiment','rendezvousExperiment','shipViewButton','replayExperiment','cameraChip']) if (!html.includes(`id=\"${id}\"`)) throw new Error(`Particle experiment control missing: ${id}`);
for (const id of ['cosmosToggle','cosmosPanel','phenomenonSelect','phenomenonReality','phenomenonScanDepth','mapToggle','mapPanel','systemMapCanvas','mapBodySelect','mapViewMode','mapSelectionFrameArrival','mapZoom','mapUnknownToggle','mapSelectAction','mapScanAction','mapTransitAction','mapCosmosAction','mapEventsAction','eventsPanel','eventsClose','eventObserverName','eventObserverModel','eventStartTime','eventHorizon','eventSearch','eventCancel','eventProgressFill','eventProgressText','eventStatus','eventResults','scanPhenomenon','observePhenomenon','orbitPhenomenon','nextPhenomenon','rendezvousPhenomenon','shipViewCosmos','compactObjectType','neutronStarMass','pulsarSpinPeriod','pulsarMagneticField','spawnNeutronStar','extremeObjectType','spawnExtremeObject','spaceWeatherActive','spaceWeatherNext','spaceWeatherStatus','triggerCme','autoWeatherToggle','overlayToggle','overlayPanel','overlayMaster','overlayLagrange','overlayHill','overlayRoche','overlayGravity','overlayOrbitPlane']) if (!html.includes(`id=\"${id}\"`)) throw new Error(`Cosmic exploration control missing: ${id}`);
for (const id of ['landTarget','surfaceLandButton','mapLandAction','surfaceHud','surfaceWorldName','surfaceBiome','surfaceGravity','surfaceTemperature','surfaceAtmosphere','surfaceCoords','surfaceDiscoveries','surfaceNearest','surfaceScanStatus','surfaceScanButton','surfaceSprintButton','surfaceSaveButton','surfaceTakeoffButton','surfaceMovePad','surfaceForward','surfaceBack','surfaceLeft','surfaceRight','surfaceWeather','surfaceWind','surfaceShipDistance','surfaceClock','surfaceWeatherStatus','surfaceRegionSelect','surfaceRegionLabel','surfaceHudToggle','surfaceHudDetails','surfaceShipCompact','surfacePhase','surfaceSkyClock','surfaceRotation','surfaceLatLon','surfaceRotationPhase','surfaceStarAltAz','surfaceSolarTime','surfaceAstronomyPause','surfacePlannerButton','surfaceStarDisk','surfaceEclipse','surfaceTargetPhase','surfaceTargetAngular']) if (!html.includes(`id=\"${id}\"`)) throw new Error(`Surface foundation control missing: ${id}`);
for (const id of ['mapSelectionAngular','mapSelectionPhase','mapSelectionShadow']) if (!html.includes(`id=\"${id}\"`)) throw new Error(`Celestial appearance map diagnostic missing: ${id}`);
for (const id of ['targetAngularDiameter','targetIllumination','targetStellarShadow']) if (!html.includes(`id=\"${id}\"`)) throw new Error(`Celestial appearance scanner diagnostic missing: ${id}`);
for (const id of ['mapSelectionEscape','mapSelectionFlux','mapSelectionEquilibrium','mapSelectionAlbedo','mapSelectionPressure','mapSelectionRetention','mapSelectionVolatiles','mapSelectionSurfaceFamily','mapSelectionTidal']) if (!html.includes(`id="${id}"`)) throw new Error(`Planetary environment map diagnostic missing: ${id}`);
const surfaceGenerator = await readFile(new URL('../src/surface/surfaceGenerator.js', import.meta.url), 'utf8');
for (const token of ['Shatterfall Basin','Glasswind Flats','Frostscar Rise','fracture-gate','gravity-knot','frozen-lightning','reverse-shadow','vacuum-bloom','ghost-ruin','chronal-shear','IMPOSSIBLE / FICTIONAL']) if (!surfaceGenerator.includes(token)) throw new Error(`Surface generator token missing: ${token}`);
const surfaceSession = await readFile(new URL('../src/surface/surfaceSession.js', import.meta.url), 'utf8');
for (const token of ['createSurfaceSession','serializeSurfaceSession','stepSurfaceMovement','scanNearestSurfacePoi']) if (!surfaceSession.includes(token)) throw new Error(`Surface session token missing: ${token}`);
for (const token of ['bodyFixedAnchor','anchorCapturedAtSimSeconds','rotationModelVersion']) if (!surfaceSession.includes(token)) throw new Error(`Body-fixed surface session token missing: ${token}`);
const planetaryRotation = await readFile(new URL('../src/core/planetaryRotation.js', import.meta.url), 'utf8');
for (const token of ['captureBodyFixedSurfaceAnchor','bodyFixedDirectionToInertial','inertialDirectionToBodyFixed','surfaceTangentBasis','rotationAngleAt','localSolarTimeHours']) if (!planetaryRotation.includes(token)) throw new Error(`Planetary rotation token missing: ${token}`);
const celestialAppearance = await readFile(new URL('../src/core/celestialAppearance.js', import.meta.url), 'utf8');
for (const token of ['apparentAngularRadiusRad','phaseAngleRad','illuminatedFractionFromPhaseAngle','diskOccultation','stellarVisibilityAtBody','observerStarOccultation']) if (!celestialAppearance.includes(token)) throw new Error(`Celestial appearance token missing: ${token}`);
const surfaceWorld = await readFile(new URL('../src/render/surfaceWorld.js', import.meta.url), 'utf8');
for (const token of ['SurfaceWorldVisual','createTerrain','InstancedMesh','createFractureGate','createGravityKnot','createFrozenLightning','createReverseShadow','createVacuumBloom','createGhostRuin','createChronalShear','createLandedShip','createShipTransitionFx','createWeatherRig','updateWeather','updateShipTransition']) if (!surfaceWorld.includes(token)) throw new Error(`Surface renderer token missing: ${token}`);
for (const token of ['updateStarfieldViewBasis','_astronomicalSkyProjectionTime','solveSurfaceAtmosphericOptics','directStellarTransmission','extinctionCoefficient550PerMeter']) if (!surfaceWorld.includes(token)) throw new Error(`Continuous surface sky token missing: ${token}`);
for (const token of ['createSurfacePhaseSphere','compressedSkyShellDistance','observerStarVisibleFraction','_baseBackgroundColor','_baseFogColor']) if (!surfaceWorld.includes(token)) throw new Error(`Celestial surface appearance token missing: ${token}`);
const app = await readFile(new URL('../src/app/app.js', import.meta.url), 'utf8');
const collisionMonitor = await readFile(new URL('../src/physics/collisionMonitor.js', import.meta.url), 'utf8');
for (const token of ['CollisionStateBuffer','stepFraction','contactPositionA','contactVelocityA']) if (!collisionMonitor.includes(token)) throw new Error(`Collision hardening token missing: ${token}`);
const impactModel = await readFile(new URL('../src/physics/impactModel.js', import.meta.url), 'utf8');
for (const token of ['gas-giant atmosphere/envelope','centerOfMassVelocity','targetVelocityAfter','ejectaEnergyBudgetJ']) if (!impactModel.includes(token)) throw new Error(`Impact conservation token missing: ${token}`);
const impactResolver = await readFile(new URL('../src/physics/impactResolver.js', import.meta.url), 'utf8');
for (const token of ['schwarzschildRadius','postContactSeconds','targetVelocityAfter']) if (!impactResolver.includes(token)) throw new Error(`Impact resolver hardening token missing: ${token}`);
const pairStepControl = await readFile(new URL('../src/physics/massivePairStepControl.js', import.meta.url), 'utf8');
for (const token of ['massivePairPhysicsStepLimitSeconds','dynamicalTime','crossingLimit']) if (!pairStepControl.includes(token)) throw new Error(`Massive-pair timestep token missing: ${token}`);

// Direct shell/UI integrity: all HTML ids must be unique and every literal #id selector used by
// UniverseLabApp must resolve in the shell. This specifically protects mobile drawer integration.
const htmlIds = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
const htmlIdSet = new Set(htmlIds);
if (htmlIds.length !== htmlIdSet.size) {
  const duplicates = [...new Set(htmlIds.filter((id, index) => htmlIds.indexOf(id) !== index))];
  throw new Error(`Duplicate HTML id(s): ${duplicates.join(', ')}`);
}
const literalSelectorIds = new Set();
for (const match of app.matchAll(/\$\(['"]#([^'"]+)['"]\)/g)) literalSelectorIds.add(match[1]);
for (const match of app.matchAll(/querySelector\(['"]#([^'"]+)['"]\)/g)) literalSelectorIds.add(match[1]);
const missingSelectorIds = [...literalSelectorIds].filter((id) => !htmlIdSet.has(id));
if (missingSelectorIds.length) throw new Error(`Missing HTML id(s) referenced by app: ${missingSelectorIds.join(', ')}`);

const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');
if (!css.includes('--app-height')) throw new Error('Visual viewport height CSS hook missing.');
if (!css.includes('-webkit-touch-callout:none')) throw new Error('iOS touch-callout suppression missing.');
if (!css.includes('user-select:none')) throw new Error('Game-surface text-selection suppression missing.');
if (!css.includes('.hold-button.thrust{grid-row:1 / span 2') || !css.includes('@media (orientation:landscape) and (max-height:500px){.flight-controls')) throw new Error('Compact thumb-safe landscape thrust cluster missing.');
const main = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
if (!main.includes('visualViewport')) throw new Error('VisualViewport mobile sizing hook missing.');
for (const token of ['selectstart','contextmenu','lostpointercapture','document.addEventListener(\'pointerup\'','aria-pressed','is-held']) {
  if (!app.includes(token)) throw new Error(`Hardened iOS hold-input token missing: ${token}`);
}
if (!html.includes('data-preset="chicxulub"')) throw new Error('Impact preset controls missing.');
const factory = await readFile(new URL('../src/render/celestialFactory.js', import.meta.url), 'utf8');
if (!factory.includes('physical-reflector') || !factory.includes('small-body-readability-proxy')) throw new Error('Physical-reflector / small-body readability separation missing.');
for (const token of ['accretion-disk','photon-rings','relativistic-jets-visual','pseudo-lensing-halo','pulsar-beam-pivot','comet-tail']) if (!factory.includes(token)) throw new Error(`Cosmic celestial visual token missing: ${token}`);
for (const token of ['stellar-photosphere','stellar-granulation','stellar-limb-darkening','stellar-corona-micro','stellar-prominence-core','stellar-active-regions','stellar-flare-sites']) if (!factory.includes(token)) throw new Error(`Stellar rendering token missing: ${token}`);
if (!impactResolver.includes('resolveImpact')) throw new Error('Impact resolver missing.');
const flightComputer = await readFile(new URL('../src/physics/flightComputer.js', import.meta.url), 'utf8');
for (const token of ['computeApproachAcceleration','computeStationKeepAcceleration','propulsionSafeStandOffDistanceMeters','navigationPhysicsStepLimitSeconds','newtonianModelLimit','computeMatchVelocityAcceleration','computeAbsoluteBrakeAcceleration','computeTurnAndBurnAcceleration','recommendedWarpCap']) if (!flightComputer.includes(token)) throw new Error(`Flight-computer function missing: ${token}`);
const transitDrive = await readFile(new URL('../src/physics/transitDrive.js', import.meta.url), 'utf8');
for (const token of ['TRANSIT_TIERS','normalizeTransitMultiple','transitArrivalDistanceMeters','firstTransitGuardHit','advanceTransitPosition','matchFrameExitVelocity']) if (!transitDrive.includes(token)) throw new Error(`Transit-drive function missing: ${token}`);
const particleManager = await readFile(new URL('../src/experiments/particles/particleExperimentManager.js', import.meta.url), 'utf8');
for (const token of ['Gravity Cloud','Particle Life','Species Forces','recommendedWarpCap']) if (!particleManager.includes(token)) throw new Error(`Particle framework token missing: ${token}`);
const spatialHash = await readFile(new URL('../src/experiments/particles/spatialHashGrid.js', import.meta.url), 'utf8');
if (!spatialHash.includes('Int32Array') || !spatialHash.includes('headAt')) throw new Error('Typed-array spatial hash missing.');
if (!impactModel.includes('Math.min(2')) throw new Error('Per-impact resolved-fragment cap missing.');
if (!app.includes('spawnParticleField') || !app.includes('fireParticleGun')) throw new Error('Particle app integration missing.');
const classMethodDefinitions = new Set([...app.matchAll(/^\s{2}(?:async\s+)?([A-Za-z_$][\w$]*)\s*\([^\n]*\)\s*\{/gm)].map((match) => match[1]));
const directThisCalls = new Set([...app.matchAll(/\bthis\.([A-Za-z_$][\w$]*)\s*\(/g)].map((match) => match[1]));
for (const method of directThisCalls) if (!classMethodDefinitions.has(method)) throw new Error(`UniverseLabApp calls missing class method: ${method}`);
if (!classMethodDefinitions.has('enforceParticleWarpSafety')) throw new Error('Particle warp safety method definition missing.');
for (const token of ['enterObservation','currentCameraView','rendezvousExperiment','experimentNavigationTarget','particleFieldParams','updateParticleLabStatus','replaySelectedExperiment','engageTransit','updateTransit','requestTimeScale','updateVelocityMarker','phenomenonState','selectPhenomenon','scanPhenomenon','updateCosmosPanel','enterCosmicObservation','rendezvousPhenomenon']) if (!app.includes(token)) throw new Error(`Observation/navigation app function missing: ${token}`);
const backendPolicy = await readFile(new URL('../src/render/backendPolicy.js', import.meta.url), 'utf8');
for (const token of ['isAppleMobileWebKit','rendererBackendPolicy','MacIntel','maxTouchPoints','ios-webkit-presentation-isolation']) if (!backendPolicy.includes(token)) throw new Error(`Renderer backend policy token missing: ${token}`);
const renderer = await readFile(new URL('../src/render/threeRenderer.js', import.meta.url), 'utf8');
if (!main.includes("./app/app.js?v=1531")) throw new Error('Main-to-app cache-busting import missing.');
if (!app.includes("../render/threeRenderer.js?v=1531") || !app.includes("../ui/hud.js?v=1531") || !app.includes("../ui/systemMap.js?v=1531")) throw new Error('App cache-busting imports missing.');
if (!renderer.includes("./cockpitView.js?v=1531")) throw new Error('Cockpit renderer cache-busting import missing.');
const cockpit = await readFile(new URL('../src/render/cockpitView.js', import.meta.url), 'utf8');
for (const token of ['class CockpitView','NAVIGATION','FLIGHT','SCIENCE','SYSTEM DIAGNOSTICS','diagnostics-screen','drawDiagnosticsScreen','pick(clientX','cockpitAction','MAP','APPR','ENG','SCAN','OVR']) if (!cockpit.includes(token)) throw new Error(`3D cockpit token missing: ${token}`);
for (const token of ['experimentVisuals','syncParticleExperiments','cosmicVisuals','syncCosmicPhenomena','PointsMaterial','particleExperiments = []','cosmicPhenomena = []','cameraView = null','renderShipView','renderObservationView','referenceFrame.centerOn(observer?.inertialPosition ?? ship.position)','centerStarfieldOnCamera']) if (!renderer.includes(token)) throw new Error(`Renderer integration token missing: ${token}`);
if (!renderer.includes('forceWebGL: this.backendPolicy.forceWebGL')) throw new Error('Boot-time WebGL2 force policy is not wired into WebGPURenderer.');
if (!renderer.includes("return 'WebGL2 iOS'")) throw new Error('Forced iOS WebGL2 backend HUD label missing.');
for (const token of ['updateStellarPerception','toneMappingExposure','updateCameraClipPlane','galacticBandFactor']) if (!renderer.includes(token)) throw new Error(`Stellar renderer integration token missing: ${token}`);
const constantsSource = await readFile(new URL('../src/core/constants.js', import.meta.url), 'utf8');
for (const token of ['NEUTRON_STAR','WHITE_DWARF','BROWN_DWARF','ROGUE_PLANET','COMET']) if (!constantsSource.includes(token)) throw new Error(`Cosmic body kind missing: ${token}`);
const phenomenonGenerator = await readFile(new URL('../src/cosmic/phenomenonGenerator.js', import.meta.url), 'utf8');
for (const token of ['asteroid-belt','planetary-rings','supernova-remnant','rogue-planet','scientificStatus']) if (!phenomenonGenerator.includes(token)) throw new Error(`Phenomenon generator token missing: ${token}`);
const phenomenonRenderer = await readFile(new URL('../src/render/cosmicPhenomena.js', import.meta.url), 'utf8');
if (!phenomenonRenderer.includes('THREE.Points') || !phenomenonRenderer.includes('supernova-remnant') || !phenomenonRenderer.includes('anomaly-') || !phenomenonRenderer.includes('updateCosmicPhenomenonVisual')) throw new Error('Cosmic phenomenon GPU proxy renderer missing.');
const spaceWeather = await readFile(new URL('../src/cosmic/spaceWeather.js', import.meta.url), 'utf8');
for (const token of ['SpaceWeatherManager','triggerCme','ship-hit','nextAutoEventSeconds','serialize','restore']) if (!spaceWeather.includes(token)) throw new Error(`Space weather token missing: ${token}`);
const stellarPerception = await readFile(new URL('../src/render/stellarPerception.js', import.meta.url), 'utf8');
for (const token of ['stellarPerceptualProfile','distantMacroBoost','galacticBandFactor','apparentAngularRadius']) if (!stellarPerception.includes(token)) throw new Error(`Stellar perceptual LOD token missing: ${token}`);
const overlayMath = await readFile(new URL('../src/cosmic/scientificOverlays.js', import.meta.url), 'utf8');
for (const token of ['hillRadiusMeters','rocheLimitMeters','lagrangePointEstimates','gravityVectorSamples','orbitalPlaneBasis']) if (!overlayMath.includes(token)) throw new Error(`Scientific overlay math token missing: ${token}`);
for (const token of ['triggerSpaceWeather','updateSpaceWeatherPanel','setOverlaySetting','updateOverlayPanel','spawn-extreme-star']) if (!app.includes(token)) throw new Error(`Extreme-space app integration missing: ${token}`);
if (!renderer.includes('spaceWeatherVisuals') || !renderer.includes('scientificOverlayHolder') || !renderer.includes('syncScientificOverlays')) throw new Error('Space-weather/scientific-overlay renderer integration missing.');
if (!css.includes('.cockpit-overlay') || !css.includes('.ship-cockpit-enabled') || !css.includes('.cockpit-live-status')) throw new Error('Cockpit overlay/status CSS missing.');
if (!css.includes('.ship-cockpit-enabled .top-hud .stat{display:none}') || !css.includes('.ship-cockpit-enabled .seed-chip{display:none}')) throw new Error('Cockpit-mode top diagnostic cleanup CSS missing.');
if (!app.includes('toggleCockpit') || !app.includes('updateCockpitUi') || !app.includes('syncViewClasses') || !app.includes('cockpitEnabled') || !app.includes('handleCockpitAction') || !app.includes('cockpitTelemetry')) throw new Error('Interactive cockpit app integration missing.');
for (const token of ['rendererBackend: this.rendererBackend','physicsMs: this.physicsMs','renderMs: this.renderMs','drawCalls: runtime.drawCalls','predictionMs: this.predictionMs','experimentParticles: this.particleExperiments.activeParticles']) if (!app.includes(token)) throw new Error(`Cockpit diagnostics telemetry missing: ${token}`);
const atmosphericOptics = await readFile(new URL('../src/physics/atmosphericOptics.js', import.meta.url), 'utf8');
for (const token of ['ATMOSPHERIC_OPTICS_MODEL_VERSION','rayleighVerticalOpticalDepthRgb','opticalAirMass','atmosphericScaleHeightMeters','solveSurfaceAtmosphericOptics','solveOrbitalAtmosphereLimb','Dry-air-like Rayleigh']) if (!atmosphericOptics.includes(token)) throw new Error(`Atmospheric optics token missing: ${token}`);
for (const token of ['syncPlanetaryAtmosphereVisual','planetary-atmosphere-limb','THREE.BackSide']) if (!factory.includes(token)) throw new Error(`Orbital atmosphere-limb token missing: ${token}`);
const versionJson = JSON.parse(await readFile(new URL('../VERSION.json', import.meta.url), 'utf8'));
if (versionJson.buildMarker !== 'INPUTREL-1531') throw new Error('VERSION.json build marker mismatch.');
if (!String(versionJson.atmosphericOpticsModel || '').includes('Rayleigh') || !String(versionJson.atmosphericOpticsModel || '').includes('aerosol/Mie')) throw new Error('VERSION.json atmospheric optics model boundary missing.');
if (!String(versionJson.surfaceAtmosphericOptics || '').includes('Airless') && !String(versionJson.surfaceAtmosphericOptics || '').includes('airless')) throw new Error('VERSION.json surface atmosphere optics boundary missing.');
if (!String(versionJson.orbitalAtmosphereLimb || '').includes('scale height')) throw new Error('VERSION.json orbital atmosphere limb capability missing.');

if (!String(versionJson.collisionDetection || '').includes('first relative-motion intersection root')) throw new Error('VERSION.json swept-contact capability missing.');
if (!String(versionJson.impactConservation || '').includes('linear momentum') || !String(versionJson.impactConservation || '').includes('COM impact energy')) throw new Error('VERSION.json impact-conservation capability missing.');
if (!String(versionJson.blackHoleAccretion || '').includes('mandatory collision sink')) throw new Error('VERSION.json black-hole sink capability missing.');
if (!String(versionJson.majorBodyStepControl || '').includes('dynamical-time')) throw new Error('VERSION.json close-pair timestep capability missing.');
if (!String(versionJson.minorFieldCadence || '').includes('30 Hz')) throw new Error('VERSION.json minor-field cadence capability missing.');
if (!String(versionJson.astronomicalObserver || '').includes('read-only canonical observer')) throw new Error('VERSION.json astronomical observer capability missing.');
if (!String(versionJson.planetaryRotation || '').includes('body-fixed')) throw new Error('VERSION.json planetary rotation capability missing.');
if (!String(versionJson.surfacePhysicsBoundary || '').includes('N-body') || !String(versionJson.surfacePhysicsBoundary || '').includes('ShipDynamics')) throw new Error('VERSION.json continuous surface-astronomy boundary missing.');
if (!String(versionJson.surfaceSkyTime || '').includes('1×')) throw new Error('VERSION.json continuous surface sky-time capability missing.');
if (!String(versionJson.surfaceAstronomyDiagnostics || '').includes('primary-star altitude/azimuth') || !String(versionJson.surfaceAstronomyDiagnostics || '').includes('local solar time')) throw new Error('VERSION.json surface astronomy diagnostics capability missing.');
if (!String(versionJson.celestialAppearance || '').includes('phase-angle') || !String(versionJson.celestialAppearance || '').includes('finite-disk')) throw new Error('VERSION.json celestial appearance capability missing.');
if (!String(versionJson.planetMoonLighting || '').includes('self-emission') || !String(versionJson.planetMoonLighting || '').includes('exposure-normalized')) throw new Error('VERSION.json planet/moon lighting boundary missing.');
if (!String(versionJson.surfaceCelestialDisks || '').includes('apparent angular size') || !String(versionJson.surfaceCelestialDisks || '').includes('compressed')) throw new Error('VERSION.json surface celestial disk capability missing.');
if (!String(versionJson.eclipseGeometry || '').includes('dominant single foreground occulter')) throw new Error('VERSION.json eclipse-geometry limitation missing.');
if (!String(versionJson.cockpitView || '').includes('SYSTEM DIAGNOSTICS') || !String(versionJson.cockpitInteraction || '').includes('SYSTEM DIAGNOSTICS')) throw new Error('VERSION.json integrated cockpit diagnostics capability missing.');
if (!String(versionJson.cockpitLighting || '').includes('emissive-only')) throw new Error('VERSION.json cockpit lighting capability missing.');
if (!String(versionJson.cockpitDiagnostics || '').includes('renderer') || !String(versionJson.cockpitDiagnostics || '').includes('draw calls')) throw new Error('VERSION.json cockpit diagnostics capability missing.');
if (!String(versionJson.portraitCockpitLayout || '').includes('central FLIGHT MFD') || !String(versionJson.portraitCockpitLayout || '').includes('NAV/FLIGHT/SCI/SYS')) throw new Error('VERSION.json portrait cockpit capability missing.');
if (!String(versionJson.cockpitInteraction || '').includes('dedicated read-only Engineering/Diagnostics')) throw new Error('VERSION.json engineering drawer capability missing.');
if (!String(versionJson.assetCachePolicy || '').includes('styles.css') || !String(versionJson.assetCachePolicy || '').includes('src/main.js')) throw new Error('VERSION.json cache policy missing.');
if (!String(versionJson.frameDrive || '').includes('spacecraft-only') || !String(versionJson.frameDrive || '').includes('target inertial velocity')) throw new Error('VERSION.json FRAME drive isolation capability missing.');
if (!html.includes('id="frameQuick"') || !html.includes('SPECULATIVE FRAME DRIVE')) throw new Error('Direct FRAME cockpit control/UI missing.');
if (!app.includes('if (this.transitState.active) this.updateTransit(orbitalRealDt);')) throw new Error('FRAME must remain usable independently of the simulation running flag.');

const planetaryEnvironment = await readFile(new URL('../src/physics/planetaryEnvironment.js', import.meta.url), 'utf8');
for (const token of ['derivePlanetaryEnvironment','escapeVelocityMps','stellarFluxWm2','equilibriumTemperatureK','jeansEscapeParameter','pressureFromAtmosphereMassFraction']) if (!planetaryEnvironment.includes(token)) throw new Error(`Planetary environment token missing: ${token}`);
if (!String(versionJson.planetaryEnvironmentModel || '').includes('hard derived physics') || !String(versionJson.planetaryEnvironmentModel || '').includes('seeded formation')) throw new Error('VERSION.json planetary environment model boundary missing.');
if (!String(versionJson.planetaryAtmosphereBoundary || '').includes('proxy') || !String(versionJson.planetaryAtmosphereBoundary || '').includes('greenhouse')) throw new Error('VERSION.json atmosphere proxy boundary missing.');

const observationPlanner = await readFile(new URL('../src/navigation/observationPlanner.js', import.meta.url), 'utf8');
for (const token of ['ObservationPlannerSearch','cloneBodiesForObservationPlanning','VelocityVerletIntegrator','diskOccultation','massivePairPhysicsStepLimitSeconds','CURRENT LANDED SITE','BODY CENTER']) if (!observationPlanner.includes(token)) throw new Error(`Observation planner token missing: ${token}`);
if (!String(versionJson.observationPlanner || '').includes('cloned N-body') || !String(versionJson.observationPlanner || '').includes('10 s')) throw new Error('VERSION.json observation planner capability missing.');
if (!String(versionJson.observationPlannerBoundary || '').includes('never mutates') || !String(versionJson.observationPlannerBoundary || '').includes('future pilot motion')) throw new Error('VERSION.json observation planner boundary missing.');

const surfaceWeather = await readFile(new URL('../src/surface/surfaceWeather.js', import.meta.url), 'utf8');
for (const token of ['createSurfaceWeatherState','stepSurfaceWeather','serializeSurfaceWeather','surfaceWeatherReading','upward-rain','shadow-fog','suspended-lightning','sky-fracture']) if (!surfaceWeather.includes(token)) throw new Error(`Surface weather token missing: ${token}`);
for (const token of ['availableSurfaceRegions','selectedSurfaceRegionId','surfaceWeatherReading','stepSurfaceWeather']) if (!app.includes(token)) throw new Error(`Surface environment app token missing: ${token}`);

if (!css.includes('.surface-compact-bar') || !css.includes('.surface-hud.expanded') || !css.includes('.surface-compact-metrics')) throw new Error('Compact surface HUD CSS missing.');
if (!app.includes('setSurfaceHudExpanded') || !app.includes('toggleSurfaceHud')) throw new Error('Surface HUD collapse/expand integration missing.');
if (!String(versionJson.surfaceHud || '').includes('compact-by-default')) throw new Error('VERSION.json surface HUD capability missing.');

const landingTransition = await readFile(new URL('../src/surface/landingTransition.js', import.meta.url), 'utf8');
for (const token of ['SURFACE_PHASE','DESCENDING','LANDED','ASCENDING','beginLandingTransition','stepLandingTransition','canEnterSurface','canRequestTakeoff','validateOrbitHandoff']) if (!landingTransition.includes(token)) throw new Error(`Landing transition token missing: ${token}`);
for (const token of ['requestSurfaceTakeoff','completeSurfaceAscent','commitSurfaceOrbitHandoff','surfaceOrbitHandoffStatus','recoverSurfaceRuntime','surfaceShipDistanceMeters','updateSurfaceTransitionUi']) if (!app.includes(token)) throw new Error(`Landing reliability app token missing: ${token}`);
if (!String(versionJson.landingLifecycle || '').includes('ORBIT -> DESCENDING -> LANDED -> ASCENDING -> ORBIT')) throw new Error('VERSION.json landing lifecycle capability missing.');
if (!String(versionJson.landingRecovery || '').includes('valid orbital state')) throw new Error('VERSION.json landing recovery capability missing.');
if (!String(versionJson.ascentHandoff || '').includes('three orbital frames')) throw new Error('VERSION.json ascent handoff capability missing.');
if (!String(versionJson.takeoffPhysicalDiagnostics || '').includes('iPhone Safari')) throw new Error('VERSION.json takeoff physical diagnostics capability missing.');
const anomalyGenerator = await readFile(new URL('../src/cosmic/anomalyGenerator.js', import.meta.url), 'utf8');
for (const token of ['generateAnomalies','impossible','anomaly-phase-rift','anomaly-orbital-knot']) if (!anomalyGenerator.includes(token)) throw new Error(`Anomaly generator token missing: ${token}`);
const systemMap = await readFile(new URL('../src/ui/systemMap.js', import.meta.url), 'utf8');
for (const token of ['SystemMapController','Math.log1p','scanCurrent','transitCurrent','UNIDENTIFIED SIGNAL','true-system','true-local','refreshBodyCatalog','navigationBodySnapshot']) if (!systemMap.includes(token)) throw new Error(`System map token missing: ${token}`);
const systemNavigation = await readFile(new URL('../src/navigation/systemNavigation.js', import.meta.url), 'utf8');
for (const token of ['orderedNavigationBodies','navigationBodySnapshot','conservativeHillRadiusMeters','surfaceCapabilityLabel','atmosphereModelLabel']) if (!systemNavigation.includes(token)) throw new Error(`System navigation token missing: ${token}`);
const frameOrbitInsertion = await readFile(new URL('../src/physics/frameOrbitInsertion.js', import.meta.url), 'utf8');
for (const token of ['frameOrbitInsertionPlan','applyFrameOrbitInsertion','PROGRADE_HILL_STABILITY_FRACTION','instantaneous-newtonian-circular-orbit-v1']) if (!frameOrbitInsertion.includes(token)) throw new Error(`FRAME orbit insertion token missing: ${token}`);
if (!String(versionJson.systemMap || '').includes('star → planet → moon') || !String(versionJson.systemMap || '').includes('TRUE SYSTEM')) throw new Error('VERSION.json planetary navigation map capability missing.');
if (!String(versionJson.frameOrbitArrival || '').includes('circular osculating orbit') || !String(versionJson.frameOrbitArrival || '').includes('47%')) throw new Error('VERSION.json FRAME orbit-arrival capability missing.');
if (!String(versionJson.landabilityFoundation || '').includes('airless-rocky moon proof surface') || !String(versionJson.landabilityFoundation || '').includes('gas giants')) throw new Error('VERSION.json landability foundation missing.');
if (!String(versionJson.surfaceArchitecture || '').includes('AIRLESS_ROCKY') || !String(versionJson.surfaceProofWorld || '').includes('Caelum-4361 f-A') || !String(versionJson.surfaceVacuumModel || '').includes('disable fog')) throw new Error('VERSION.json multi-world surface architecture boundary missing.');
const frameGuardRoute = await readFile(new URL('../src/navigation/frameGuardRoute.js', import.meta.url), 'utf8');
for (const token of ['planFrameGuardRoute','resolveFrameGuardWaypoint','live-body-anchored-swept-detour-v1','firstTransitGuardHit']) if (!frameGuardRoute.includes(token)) throw new Error(`FRAME guard-route token missing: ${token}`);
if (!String(versionJson.frameSafetyRouting || '').includes('live-body-anchored') || !String(versionJson.frameSafetyRouting || '').includes('never reduced')) throw new Error('VERSION.json FRAME safety-routing capability missing.');
for (const token of ['landingEligibility','enterSurface','exitSurface','frameSurface','scanSurface','serializeSurfaceSession','surfaceSession']) if (!app.includes(token)) throw new Error(`Surface app integration missing: ${token}`);
for (const token of ['surfaceAstronomyStep','captureBodyFixedSurfaceAnchor','this.clock.advance(realDt, (dt) => this.surfaceAstronomyStep(dt)']) if (!app.includes(token)) throw new Error(`Continuous surface astronomy integration missing: ${token}`);
if (!app.includes('showRuntimeError') || !app.includes('_runtimeFaulted')) throw new Error('Runtime freeze diagnostic boundary missing.');
console.log(`Static structure OK (${required.length} required files).`);
