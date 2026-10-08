import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { acquireRenderer, frameCamera, releaseRenderer } from "../gl.js";
const modelUrl = new URL("./gamecube/gcintro.glb", import.meta.url).href;
const matcapUrl = new URL("./gamecube/gc_envmap_I8.png", import.meta.url).href;
const CLIP_DURATION = 7.117;
const SAFETY_MARGIN_S = 2;
const GX_COLOR_HI = new THREE.Vector3(95 / 255, 80 / 255, 190 / 255);
const GX_COLOR_LO = new THREE.Vector3(30 / 255, 20 / 255, 60 / 255);
const GX_OUTPUT_SCALE = 2;
const GX_TEX_SCALE = 0.5;
const GX_TEX_BIAS = new THREE.Vector2(-0.21, 0.38);
const TRAIL_COLOR = new THREE.Vector3(99 / 255, 80 / 255, 187 / 255);
const NINTENDO_FRONT_COLOR = new THREE.Vector3(55 / 255, 55 / 255, 55 / 255);
const NINTENDO_BACK_COLOR = new THREE.Vector3(102 / 255, 102 / 255, 102 / 255);
const TRAIL_COUNT = 15;
const GAMECUBE_COUNT = 5;
const NINTENDO_COUNT = 8;
function GamecubeIntro({ onDone }) {
  const hostRef = useRef(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let done = false;
    let raf = 0;
    let safety = 0;
    const finish = () => {
      if (done || disposed) return;
      done = true;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      clearTimeout(safety);
      onDoneRef.current();
    };
    const renderer = acquireRenderer();
    const canvas = renderer.domElement;
    canvas.className = "teevy-gcintro__canvas";
    host.appendChild(canvas);
    const prevPixelRatio = renderer.getPixelRatio();
    const prevClearColor = renderer.getClearColor(new THREE.Color());
    const prevClearAlpha = renderer.getClearAlpha();
    const prevOutputColorSpace = renderer.outputColorSpace;
    renderer.setPixelRatio(1);
    renderer.setClearColor(0, 1);
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    const scene = new THREE.Scene();
    let camera = null;
    let baseHalfHeight = 1;
    let mixer = null;
    let gltfScene = null;
    const opacityBindings = [];
    const ownedGeometries = [];
    const ownedMaterials = [];
    const ownedTextures = [];
    const fit = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (!w || !h || !camera) return;
      renderer.setSize(w, h, false);
      frameCamera(camera, host, w, h, baseHalfHeight);
    };
    const resizeObserver = new ResizeObserver(fit);
    resizeObserver.observe(host);
    const gltfLoader = new GLTFLoader();
    const textureLoader = new THREE.TextureLoader();
    const loadGltf = () => new Promise((resolve, reject) => gltfLoader.load(modelUrl, resolve, void 0, reject));
    const loadMatcap = () => new Promise((resolve, reject) => textureLoader.load(matcapUrl, resolve, void 0, reject));
    const build = (gltf, matcap) => {
      gltfScene = gltf.scene;
      scene.add(gltfScene);
      gltfScene.updateMatrixWorld(true);
      gltfScene.traverse((node) => {
        if (!(node instanceof THREE.Mesh)) return;
        ownedGeometries.push(node.geometry);
        const materials = Array.isArray(node.material) ? node.material : [node.material];
        for (const material of materials) {
          ownedMaterials.push(material);
          const map = material.map;
          if (map) ownedTextures.push(map);
        }
      });
      const object = (name) => {
        const found = gltfScene?.getObjectByName(name);
        if (!found) throw new Error(`gcintro: ${name} missing from the model`);
        return found;
      };
      const asMesh = (node) => {
        if (node instanceof THREE.Mesh) return node;
        throw new Error(`gcintro: ${node.name} is not a mesh`);
      };
      const mesh = (name) => asMesh(object(name));
      const bindOpacity = (driverName, materials, scale = 1) => {
        opacityBindings.push({ materials, driver: object(driverName).position, scale });
      };
      const raw = (texture) => {
        texture.colorSpace = THREE.NoColorSpace;
        return texture;
      };
      const setRaw = (color, rgb) => {
        color.setRGB(rgb.x, rgb.y, rgb.z, THREE.LinearSRGBColorSpace);
      };
      const bigCube = mesh("bigCube");
      const bigCubeMap = bigCube.material.map;
      if (!bigCubeMap) throw new Error("gcintro: bigCube has no environment map");
      const envImage = bigCubeMap.image;
      const envTexture = new THREE.CubeTexture([envImage, envImage, envImage, envImage, envImage, envImage]);
      envTexture.needsUpdate = true;
      ownedTextures.push(envTexture);
      const bigMaterial = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
      bigMaterial.transparent = true;
      bigMaterial.envMap = envTexture;
      bigCube.material = bigMaterial;
      ownedMaterials.push(bigMaterial);
      bindOpacity("bigCubeOpacity", [bigMaterial], 0.5);
      raw(matcap);
      matcap.wrapS = THREE.RepeatWrapping;
      matcap.wrapT = THREE.RepeatWrapping;
      ownedTextures.push(matcap);
      const movingCube = mesh("movingCube");
      const movingMaterial = new THREE.MeshMatcapMaterial({ matcap });
      movingMaterial.transparent = true;
      movingMaterial.polygonOffset = true;
      movingMaterial.polygonOffsetFactor = -150;
      movingMaterial.onBeforeCompile = (shader) => {
        shader.uniforms.uGxLo = { value: new THREE.Vector3().copy(GX_COLOR_LO) };
        shader.uniforms.uGxHi = { value: new THREE.Vector3().copy(GX_COLOR_HI) };
        shader.uniforms.uGxScale = { value: GX_OUTPUT_SCALE };
        shader.uniforms.uTexScale = { value: GX_TEX_SCALE };
        shader.uniforms.uTexBias = { value: new THREE.Vector2().copy(GX_TEX_BIAS) };
        shader.fragmentShader = "uniform vec3 uGxLo;\nuniform vec3 uGxHi;\nuniform float uGxScale;\nuniform float uTexScale;\nuniform vec2 uTexBias;\n" + shader.fragmentShader.replace(
          "vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;",
          "vec2 uv = vec2( normal.x, normal.y ) * uTexScale + uTexBias;"
        ).replace(
          "vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;",
          "vec3 outgoingLight = clamp( mix( uGxLo, uGxHi, matcapColor.r ) * uGxScale, 0.0, 1.0 );"
        );
      };
      movingCube.material = movingMaterial;
      ownedMaterials.push(movingMaterial);
      bindOpacity("movingCubeOpacity", [movingMaterial]);
      for (let i = 0; i < TRAIL_COUNT; i++) {
        const trail = mesh(`trail${i}`);
        trail.renderOrder = 1e3;
        trail.position.x += -0.01;
        trail.position.y += 0.01;
        trail.position.z += 0.01;
        const trailMaterial = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
        setRaw(trailMaterial.color, TRAIL_COLOR);
        trailMaterial.transparent = true;
        trail.material = trailMaterial;
        ownedMaterials.push(trailMaterial);
        bindOpacity(`trail${i}Opacity`, [trailMaterial]);
      }
      for (let i = 0; i < GAMECUBE_COUNT; i++) {
        const block = mesh(`gamecube${i}`);
        block.renderOrder = 2e3;
        const blockMaterial = new THREE.MeshBasicMaterial();
        blockMaterial.transparent = true;
        block.material = blockMaterial;
        ownedMaterials.push(blockMaterial);
        bindOpacity(`gamecube${i}Opacity`, [blockMaterial]);
      }
      for (let i = 0; i < NINTENDO_COUNT; i++) {
        const letter = object(`nintendo${i}`);
        const front = asMesh(letter.children[0]);
        const back = asMesh(letter.children[1]);
        const frontMaterial = new THREE.MeshBasicMaterial();
        setRaw(frontMaterial.color, NINTENDO_FRONT_COLOR);
        frontMaterial.transparent = true;
        front.material = frontMaterial;
        const backMaterial = new THREE.MeshBasicMaterial();
        setRaw(backMaterial.color, NINTENDO_BACK_COLOR);
        backMaterial.transparent = true;
        back.material = backMaterial;
        ownedMaterials.push(frontMaterial, backMaterial);
        bindOpacity(`nintendo${i}Opacity`, [frontMaterial, backMaterial]);
      }
      const xyzMaterials = ["x", "y", "z"].map((name) => {
        const letterMaterial = mesh(name).material;
        letterMaterial.transparent = true;
        letterMaterial.depthWrite = false;
        if (letterMaterial.map) raw(letterMaterial.map);
        return letterMaterial;
      });
      bindOpacity("xyzOpacity", xyzMaterials);
      const gltfCamera = gltf.cameras[0];
      if (!(gltfCamera instanceof THREE.OrthographicCamera) && !(gltfCamera instanceof THREE.PerspectiveCamera)) {
        throw new Error("gcintro: the model has no camera");
      }
      camera = gltfCamera;
      camera.zoom = 1.8;
      baseHalfHeight = camera instanceof THREE.OrthographicCamera ? camera.top : 1;
      fit();
      mixer = new THREE.AnimationMixer(gltfScene);
      const action = mixer.clipAction(gltf.animations[0]);
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
      action.play();
    };
    const start = () => {
      let previousNow = performance.now();
      let finished = false;
      mixer?.addEventListener("finished", () => {
        finished = true;
      });
      const tick = () => {
        const now = performance.now();
        const delta = (now - previousNow) / 1e3;
        previousNow = now;
        mixer?.update(delta);
        for (const binding of opacityBindings) {
          for (const material of binding.materials) material.opacity = binding.driver.x * binding.scale;
        }
        if (camera) renderer.render(scene, camera);
        if (finished) {
          finish();
          return;
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      safety = window.setTimeout(finish, (CLIP_DURATION + SAFETY_MARGIN_S) * 1e3);
    };
    Promise.all([loadGltf(), loadMatcap()]).then(([gltf, matcap]) => {
      if (disposed || done) return;
      build(gltf, matcap);
      if (camera) renderer.compile(scene, camera);
      start();
    }).catch(() => {
      finish();
    });
    return () => {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      clearTimeout(safety);
      resizeObserver.disconnect();
      if (mixer && gltfScene) {
        mixer.stopAllAction();
        mixer.uncacheRoot(gltfScene);
      }
      for (const geometry of ownedGeometries) geometry.dispose();
      for (const material of ownedMaterials) material.dispose();
      for (const texture of ownedTextures) texture.dispose();
      ownedGeometries.length = 0;
      ownedMaterials.length = 0;
      ownedTextures.length = 0;
      if (gltfScene) scene.remove(gltfScene);
      gltfScene = null;
      camera = null;
      opacityBindings.length = 0;
      if (canvas.parentNode === host) host.removeChild(canvas);
      canvas.className = "";
      renderer.setPixelRatio(prevPixelRatio);
      renderer.setClearColor(prevClearColor, prevClearAlpha);
      renderer.outputColorSpace = prevOutputColorSpace;
      releaseRenderer(renderer);
    };
  }, []);
  return <div className="teevy-gcintro" ref={hostRef} aria-hidden="true" />;
}
export {
  GamecubeIntro
};
