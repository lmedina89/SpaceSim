import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';

const required = [
  'index.html','styles.css','src/main.js','src/app/app.js','src/core/constants.js','src/data/systemGenerator.js',
  'src/physics/gravity/directGravitySolver.js','src/physics/integrators/velocityVerlet.js','src/physics/orbitalMetrics.js',
  'src/physics/trajectoryPredictor.js','src/physics/shipDynamics.js','src/physics/flightComputer.js','src/physics/transitDrive.js','src/physics/impactResolver.js',
  'src/experiments/particles/spatialHashGrid.js','src/experiments/particles/particleExperiment.js','src/experiments/particles/particleExperimentManager.js',
  'src/cosmic/phenomenonRegistry.js','src/cosmic/phenomenonGenerator.js','src/cosmic/anomalyGenerator.js','src/cosmic/spaceWeather.js','src/cosmic/scientificOverlays.js','src/render/cosmicPhenomena.js','src/render/spaceWeatherVisuals.js','src/render/scientificOverlayVisuals.js',
  'src/render/threeRenderer.js','src/render/backendPolicy.js','src/render/observationCamera.js','src/render/stellarPerception.js','src/render/surfaceWorld.js','src/surface/surfaceGenerator.js','src/surface/surfaceSession.js','src/surface/surfaceWeather.js','src/surface/landingTransition.js','src/ui/systemMap.js','README.md','ARCHITECTURE.md','SCIENTIFIC-NOTES.md'
];
for (const file of required) await access(new URL(`../${file}`, import.meta.url), constants.R_OK);
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
if (!html.includes('three@0.185.0')) throw new Error('Three.js version is not pinned.');
if (!html.includes('./src/main.js')) throw new Error('Main module missing from shell.');
if (!html.includes('Universe Lab v0.1.4.5.4')) throw new Error('Shell version is not v0.1.4.5.4.');
if (!html.includes('RENDER-1454')) throw new Error('RENDER-1454 build marker missing.');
if (pkg.version !== '0.1.4.5.4') throw new Error('package.json version mismatch.');
if (!html.includes('id="warpQuick"')) throw new Error('Quick time-warp control missing.');
if (!html.includes('id="morePanel"')) throw new Error('Secondary mobile control drawer missing.');
if (!html.includes('id="approachButton"') || !html.includes('id="matchVelocity"') || !html.includes('id="engineModeButton"')) throw new Error('Scientific flight-computer controls missing.');
if (!html.includes('>BRAKE</button>')) throw new Error('Physical BRAKE control missing.');
for (const id of ['velocityMarker','progradeButton','retrogradeButton','turnBurnButton','transitToggle','transitPanel','transitTargetSource','transitTier','transitAutoCapture','transitEngage','cockpitOverlay','cockpitStatus','cockpitToggle','ascentDiagnostic']) if (!html.includes(`id="${id}"`)) throw new Error(`Navigation/transit/cockpit control missing: ${id}`);
for (const id of ['particleMode','particleCount','spawnParticleField','fireParticleGun','clearParticleExperiments','particleStatus','experimentSelect','observeExperiment','trackExperiment','orbitExperiment','rendezvousExperiment','shipViewButton','replayExperiment','cameraChip']) if (!html.includes(`id=\"${id}\"`)) throw new Error(`Particle experiment control missing: ${id}`);
for (const id of ['cosmosToggle','cosmosPanel','phenomenonSelect','phenomenonReality','phenomenonScanDepth','mapToggle','mapPanel','systemMapCanvas','mapZoom','mapUnknownToggle','mapSelectAction','mapScanAction','mapTransitAction','mapCosmosAction','scanPhenomenon','observePhenomenon','orbitPhenomenon','nextPhenomenon','rendezvousPhenomenon','shipViewCosmos','compactObjectType','neutronStarMass','pulsarSpinPeriod','pulsarMagneticField','spawnNeutronStar','extremeObjectType','spawnExtremeObject','spaceWeatherActive','spaceWeatherNext','spaceWeatherStatus','triggerCme','autoWeatherToggle','overlayToggle','overlayPanel','overlayMaster','overlayLagrange','overlayHill','overlayRoche','overlayGravity','overlayOrbitPlane']) if (!html.includes(`id=\"${id}\"`)) throw new Error(`Cosmic exploration control missing: ${id}`);
for (const id of ['landTarget','surfaceLandButton','mapLandAction','surfaceHud','surfaceWorldName','surfaceBiome','surfaceGravity','surfaceTemperature','surfaceAtmosphere','surfaceCoords','surfaceDiscoveries','surfaceNearest','surfaceScanStatus','surfaceScanButton','surfaceSprintButton','surfaceSaveButton','surfaceTakeoffButton','surfaceMovePad','surfaceForward','surfaceBack','surfaceLeft','surfaceRight','surfaceWeather','surfaceWind','surfaceShipDistance','surfaceClock','surfaceWeatherStatus','surfaceRegionSelect','surfaceRegionLabel','surfaceHudToggle','surfaceHudDetails','surfaceShipCompact','surfacePhase']) if (!html.includes(`id=\"${id}\"`)) throw new Error(`Surface foundation control missing: ${id}`);
const surfaceGenerator = await readFile(new URL('../src/surface/surfaceGenerator.js', import.meta.url), 'utf8');
for (const token of ['Shatterfall Basin','Glasswind Flats','Frostscar Rise','fracture-gate','gravity-knot','frozen-lightning','reverse-shadow','vacuum-bloom','ghost-ruin','chronal-shear','IMPOSSIBLE / FICTIONAL']) if (!surfaceGenerator.includes(token)) throw new Error(`Surface generator token missing: ${token}`);
const surfaceSession = await readFile(new URL('../src/surface/surfaceSession.js', import.meta.url), 'utf8');
for (const token of ['createSurfaceSession','serializeSurfaceSession','stepSurfaceMovement','scanNearestSurfacePoi']) if (!surfaceSession.includes(token)) throw new Error(`Surface session token missing: ${token}`);
const surfaceWorld = await readFile(new URL('../src/render/surfaceWorld.js', import.meta.url), 'utf8');
for (const token of ['SurfaceWorldVisual','createTerrain','InstancedMesh','createFractureGate','createGravityKnot','createFrozenLightning','createReverseShadow','createVacuumBloom','createGhostRuin','createChronalShear','createLandedShip','createShipTransitionFx','createWeatherRig','updateWeather','updateShipTransition']) if (!surfaceWorld.includes(token)) throw new Error(`Surface renderer token missing: ${token}`);
const app = await readFile(new URL('../src/app/app.js', import.meta.url), 'utf8');

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
if (!css.includes('.hold-button.thrust{grid-row:1 / span 2')) throw new Error('Large thumb-safe thrust cluster missing.');
const main = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
if (!main.includes('visualViewport')) throw new Error('VisualViewport mobile sizing hook missing.');
for (const token of ['selectstart','contextmenu','lostpointercapture','document.addEventListener(\'pointerup\'','aria-pressed','is-held']) {
  if (!app.includes(token)) throw new Error(`Hardened iOS hold-input token missing: ${token}`);
}
if (!html.includes('data-preset="chicxulub"')) throw new Error('Impact preset controls missing.');
const factory = await readFile(new URL('../src/render/celestialFactory.js', import.meta.url), 'utf8');
if (!factory.includes('Exposure-floor shell')) throw new Error('WebGPU body-color exposure floor missing.');
for (const token of ['accretion-disk','photon-rings','relativistic-jets-visual','pseudo-lensing-halo','pulsar-beam-pivot','comet-tail']) if (!factory.includes(token)) throw new Error(`Cosmic celestial visual token missing: ${token}`);
for (const token of ['stellar-photosphere','stellar-granulation','stellar-limb-darkening','stellar-corona-micro','stellar-prominence-core','stellar-active-regions','stellar-flare-sites']) if (!factory.includes(token)) throw new Error(`Stellar rendering token missing: ${token}`);
const impactResolver = await readFile(new URL('../src/physics/impactResolver.js', import.meta.url), 'utf8');
if (!impactResolver.includes('resolveImpact')) throw new Error('Impact resolver missing.');
const flightComputer = await readFile(new URL('../src/physics/flightComputer.js', import.meta.url), 'utf8');
for (const token of ['computeApproachAcceleration','computeStationKeepAcceleration','propulsionSafeStandOffDistanceMeters','navigationPhysicsStepLimitSeconds','newtonianModelLimit','computeMatchVelocityAcceleration','computeAbsoluteBrakeAcceleration','computeTurnAndBurnAcceleration','recommendedWarpCap']) if (!flightComputer.includes(token)) throw new Error(`Flight-computer function missing: ${token}`);
const transitDrive = await readFile(new URL('../src/physics/transitDrive.js', import.meta.url), 'utf8');
for (const token of ['TRANSIT_TIERS','normalizeTransitMultiple','transitArrivalDistanceMeters','firstTransitGuardHit','advanceTransitPosition']) if (!transitDrive.includes(token)) throw new Error(`Transit-drive function missing: ${token}`);
const particleManager = await readFile(new URL('../src/experiments/particles/particleExperimentManager.js', import.meta.url), 'utf8');
for (const token of ['Gravity Cloud','Particle Life','Species Forces','recommendedWarpCap']) if (!particleManager.includes(token)) throw new Error(`Particle framework token missing: ${token}`);
const spatialHash = await readFile(new URL('../src/experiments/particles/spatialHashGrid.js', import.meta.url), 'utf8');
if (!spatialHash.includes('Int32Array') || !spatialHash.includes('headAt')) throw new Error('Typed-array spatial hash missing.');
const impactModel = await readFile(new URL('../src/physics/impactModel.js', import.meta.url), 'utf8');
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
for (const token of ['experimentVisuals','syncParticleExperiments','cosmicVisuals','syncCosmicPhenomena','PointsMaterial','particleExperiments = []','cosmicPhenomena = []','cameraView = null','renderShipView','renderObservationView','referenceFrame.centerOn(ship.position)']) if (!renderer.includes(token)) throw new Error(`Renderer integration token missing: ${token}`);
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
if (!css.includes('.cockpit-overlay') || !css.includes('.ship-cockpit-enabled')) throw new Error('Cockpit overlay CSS missing.');
if (!app.includes('toggleCockpit') || !app.includes('updateCockpitUi') || !app.includes('syncViewClasses') || !app.includes('cockpitEnabled')) throw new Error('Cockpit view app integration missing.');
const versionJson = JSON.parse(await readFile(new URL('../VERSION.json', import.meta.url), 'utf8'));
if (versionJson.buildMarker !== 'RENDER-1454') throw new Error('VERSION.json build marker mismatch.');
if (!String(versionJson.cockpitView || '').includes('default-on')) throw new Error('VERSION.json cockpit capability missing.');

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
for (const token of ['SystemMapController','Math.log1p','scanCurrent','transitCurrent','UNIDENTIFIED SIGNAL']) if (!systemMap.includes(token)) throw new Error(`System map token missing: ${token}`);
for (const token of ['landingEligibility','enterSurface','exitSurface','frameSurface','scanSurface','serializeSurfaceSession','surfaceSession']) if (!app.includes(token)) throw new Error(`Surface app integration missing: ${token}`);
if (!app.includes('showRuntimeError') || !app.includes('_runtimeFaulted')) throw new Error('Runtime freeze diagnostic boundary missing.');
console.log(`Static structure OK (${required.length} required files).`);
