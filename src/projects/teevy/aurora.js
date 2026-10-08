import * as THREE from 'three'
import { acquireRenderer, releaseRenderer } from './gl'

// teevy's aurora, the raymarched waves of its Spotify visualizer. The shader is teevy's, except for
// the palette, taken from the cover; without the audio tap, a slow synthetic beat drives it.
const BASE = { timeScale: 0.5, waveSpeed: 1, waveHeight: 1, wave1Freq: 4.8, wave1Amp: 0.038, wave2Freq: 0.3, wave2Amp: -0.09, wave3FreqX: -0.6, wave3FreqZ: -0.7, wave3Amp: 0.12, noiseAmount: 0.004, foldingOffset: 9.291, stepBase: 0.146, glowIntensity: 0.0085, glowSpread: 5.1 }

const fragmentShader = `
      uniform vec3 iResolution;
      
      uniform float uWavePhase;
      uniform float uPatternPhase;
      uniform float uWaveHeight;

      uniform float uWave1Freq;
      uniform float uWave1Amp;
      uniform float uWave2Freq;
      uniform float uWave2Amp;
      uniform float uWave3FreqX;
      uniform float uWave3FreqZ;
      uniform float uWave3Amp;

      uniform float uNoiseAmount;
      uniform float uFoldingOffset;
      uniform float uStepBase;
      uniform float uGlowIntensity;
      uniform float uGlowSpread;
      uniform float uHue;
      uniform vec3 uColorA;
      uniform vec3 uColorB;

      float generateFineNoise(vec2 p) {
        vec3 p3 = fract(vec3(p.xyx) * 8.6231);
        p3 += dot(p3, p3.yzx + 67.92);
        return fract((p3.x + p3.y) * p3.z);
      }

      vec3 hueRotate(vec3 c, float a) {
        float ca = cos(a);
        float sa = sin(a);
        mat3 m = mat3(
          0.299 + 0.701 * ca + 0.168 * sa, 0.587 - 0.587 * ca + 0.330 * sa, 0.114 - 0.114 * ca - 0.497 * sa,
          0.299 - 0.299 * ca - 0.328 * sa, 0.587 + 0.413 * ca + 0.035 * sa, 0.114 - 0.114 * ca + 0.292 * sa,
          0.299 - 0.300 * ca + 1.250 * sa, 0.587 - 0.588 * ca - 1.050 * sa, 0.114 + 0.886 * ca - 0.203 * sa
        );
        return clamp(m * c, 0.0, 100.0);
      }

      void main() {
        vec2 fragCoord = gl_FragCoord.xy;
        vec2 uv = (2.0 * fragCoord - iResolution.xy) / iResolution.y;

        vec3 rayDir = normalize(vec3(uv, 1.0));

        vec4 finalColor = vec4(0.0);
        float totalDistance = 0.0;

        float pixelNoise = generateFineNoise(fragCoord) * uNoiseAmount;

        for (int i = 0; i < 38; i++) {
          vec3 currentPos = rayDir * totalDistance;
          currentPos.z -= 2.0;

          float wTime = uWavePhase;
          float waveHeight = (sin(currentPos.x * uWave1Freq + wTime) * uWave1Amp +
                              sin(currentPos.z * uWave2Freq - wTime * 0.6) * uWave2Amp +
                              sin((currentPos.x * uWave3FreqX) - (currentPos.z * uWave3FreqZ) + (wTime * 1.6)) * uWave3Amp) * uWaveHeight;

          float distToWave = abs(currentPos.y - waveHeight);

          currentPos /= uFoldingOffset;

          float stepSize = min(distToWave - 0.080, pixelNoise) + uStepBase;
          totalDistance += stepSize;

          float patternX = sin(currentPos.x + cos(currentPos.y) * cos(currentPos.z));
          float patternY = sin(currentPos.z + sin(currentPos.y) * cos(currentPos.x + uPatternPhase));
          float basePattern = smoothstep(0.5, 0.7, patternX * patternY);

          float blendFactor = 0.15 / (distToWave * distToWave + 0.01);
          float mixedPattern = mix(basePattern, 1.0, blendFactor);

          float glow = uGlowIntensity / (uGlowSpread + stepSize);
          float distanceFade = smoothstep(36.5, 7.3, totalDistance);
          vec3 paletteColor = 2.0 * mix(uColorA, uColorB, 0.5 + 0.5 * cos(totalDistance * 3.0));

          finalColor.rgb += glow * mixedPattern * distanceFade * paletteColor;
        }

        if (uHue != 0.0) {
          finalColor.rgb = hueRotate(finalColor.rgb, uHue);
        }

        float dither = (generateFineNoise(fragCoord + vec2(12.34, 56.78)) - 0.5) / 128.0;
        finalColor.rgb += vec3(dither);

        gl_FragColor = vec4(finalColor.rgb, 1.0);
      }
    `

export const mountAurora = (host, { colors, still }) => {
  const renderer = acquireRenderer()
  const canvas = renderer.domElement
  canvas.className = 'teevy-aurora__canvas'
  host.appendChild(canvas)
  const ratio = renderer.getPixelRatio()
  const uniforms = {
    iResolution: { value: new THREE.Vector3(1, 1, 1) },
    uWavePhase: { value: 0 },
    uPatternPhase: { value: 0 },
    uWaveHeight: { value: BASE.waveHeight },
    uWave1Freq: { value: BASE.wave1Freq },
    uWave1Amp: { value: BASE.wave1Amp },
    uWave2Freq: { value: BASE.wave2Freq },
    uWave2Amp: { value: BASE.wave2Amp },
    uWave3FreqX: { value: BASE.wave3FreqX },
    uWave3FreqZ: { value: BASE.wave3FreqZ },
    uWave3Amp: { value: BASE.wave3Amp },
    uNoiseAmount: { value: BASE.noiseAmount },
    uFoldingOffset: { value: BASE.foldingOffset },
    uStepBase: { value: BASE.stepBase },
    uGlowIntensity: { value: BASE.glowIntensity },
    uGlowSpread: { value: BASE.glowSpread },
    uHue: { value: 0 },
    uColorA: { value: new THREE.Color(colors[0]) },
    uColorB: { value: new THREE.Color(colors[1]) },
  }
  const material = new THREE.ShaderMaterial({ vertexShader: 'void main() { gl_Position = vec4(position, 1.0); }', fragmentShader, uniforms, depthTest: false, depthWrite: false })
  const geometry = new THREE.PlaneGeometry(2, 2)
  const scene = new THREE.Scene()
  scene.add(new THREE.Mesh(geometry, material))
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  let raf = 0
  let last = performance.now()
  let wave = 0
  let pattern = 0

  const fit = () => {
    renderer.setSize(host.clientWidth, host.clientHeight, false)
    uniforms.iResolution.value.set(host.clientWidth * ratio, host.clientHeight * ratio, 1)
  }

  const draw = () => {
    const now = performance.now()
    const dt = Math.min((now - last) / 1000, 0.05)
    last = now
    // A beat around 95 bpm, the tempo of a cloud rap record, standing in for the audio tap
    const beat = Math.max(0, Math.sin((now / 1000) * Math.PI * 2 * (95 / 60))) ** 4
    const energy = 0.25 + 0.35 * beat
    pattern += dt * BASE.timeScale * (1 + energy * 0.5)
    wave += dt * BASE.timeScale * (1 + energy * 0.5) * (1 + energy * 0.9)
    uniforms.uWavePhase.value = wave
    uniforms.uPatternPhase.value = pattern
    uniforms.uWaveHeight.value = BASE.waveHeight * (1 + beat * 0.6)
    uniforms.uGlowIntensity.value = BASE.glowIntensity * (1 + energy * 0.8)
    renderer.render(scene, camera)
    raf = requestAnimationFrame(draw)
  }

  const observer = new ResizeObserver(fit)
  observer.observe(host)
  fit()

  if (still) {
    uniforms.uWavePhase.value = 1.2
    uniforms.uPatternPhase.value = 1.2
    renderer.render(scene, camera)
  } else {
    draw()
  }

  return () => {
    cancelAnimationFrame(raf)
    observer.disconnect()
    geometry.dispose()
    material.dispose()
    if (canvas.parentNode === host) host.removeChild(canvas)
    canvas.className = ''
    releaseRenderer(renderer)
  }
}
