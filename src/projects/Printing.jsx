import { useEffect, useRef, useState } from 'react'
import { Choices, Tags, usePrefersReducedMotion } from './shared'
import './printing.css'

// Exploded offsets in mm, Y up, taken from each project's exploded() module
const PIECES = [
  {
    id: 'top-fan',
    title: 'top-fan',
    text: 'The extraction plate at the top of the rack: four 120 mm ARCTIC P12 Pro fans, PWM driven, for a 335 × 335 mm cut-out. Printed and mounted.',
    tags: ['OpenSCAD', 'Python', 'PWM'],
    model: new URL('../assets/topfan/top-fan.glb', import.meta.url),
    direction: [0.7, 0.78, 1],
    explode: {
      clamps: [0, 0, 0],
      sheet: [0, 32, 0],
      fans: [0, 69, 0],
      frame: [0, 179, 0],
      controller: [0, 179, 0],
      guards: [0, 234, 0],
    },
    photo: {
      id: 'printed',
      label: 'Printed',
      src: new URL('../assets/topfan/IMG_2218.webp', import.meta.url),
      width: 900,
      height: 1200,
      position: '50% 58%',
      alt: 'Two printed top-fan quadrants bolted together, with their fans and the PWM controller',
    },
  },
  {
    id: 'nas',
    title: 'nas',
    text: `A 2U 19" NAS block for eight 3.5" drives, remixed from PCrnjak's 1U four-drive model, with a wall of fans. Three of them will fill the rack.`,
    tags: ['OpenSCAD', 'Python', '19" rack'],
    model: new URL('../assets/nas/nas.glb', import.meta.url),
    direction: [-0.75, 0.62, 1],
    explode: {
      half_l: [-40, 0, 0],
      disks_l: [-40, 0, 0],
      rail_l: [-40, 0, 0],
      half_r: [40, 0, 0],
      disks_r: [40, 0, 0],
      rail_r: [40, 0, 0],
      wall_l: [-20, 0, -80],
      wall_r: [20, 0, -80],
      fans: [0, 0, -80],
      psu_tray: [0, 0, -120],
      psu: [0, 0, -120],
      psu_bars: [0, 0, -120],
    },
    photo: {
      id: 'rack',
      label: 'Rack',
      src: new URL('../assets/nas/baie-photo.webp', import.meta.url),
      width: 1000,
      height: 1200,
      position: '50% 40%',
      alt: 'The rack the NAS blocks will slide into',
    },
  },
]

const TURN = Math.PI / 12

const createViewer = async ({ host, url, direction, explode, reduced, insets, onProgress }) => {
  const [THREE, { OrbitControls }, { GLTFLoader }, { MeshoptDecoder }, { RoomEnvironment }] = await Promise.all([
    import('three'),
    import('three/examples/jsm/controls/OrbitControls.js'),
    import('three/examples/jsm/loaders/GLTFLoader.js'),
    import('three/examples/jsm/libs/meshopt_decoder.module.js'),
    import('three/examples/jsm/environments/RoomEnvironment.js'),
  ])

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderer.toneMapping = THREE.NeutralToneMapping
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  renderer.domElement.className = 'printing__canvas'

  const disposables = []
  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  const room = new RoomEnvironment()
  scene.environment = pmrem.fromScene(room, 0.04).texture
  scene.environmentIntensity = 0.45
  room.dispose()
  pmrem.dispose()
  disposables.push(scene.environment)

  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
  const gltf = await loader.loadAsync(url.href, (event) => event.total && onProgress(event.loaded / event.total))
  const model = gltf.scene

  // Every part, with where it sits assembled and where the exploded view sends it
  const parts = []
  model.traverse((object) => {
    if (!object.isMesh) {
      return
    }

    object.castShadow = true
    object.receiveShadow = true
    object.material.roughness = 0.5
    if (object.material.transparent) {
      object.material.depthWrite = false
      object.castShadow = false
    }
    disposables.push(object.geometry, object.material)
  })
  model.children.forEach((object, index) => {
    const offset = new THREE.Vector3(...(explode[object.name] || [0, 0, 0]))
    parts.push({ object, index, base: object.position.clone(), offset, from: null, to: null, delay: 0 })
  })

  // Frame both states at once: toggling never zooms
  const assembled = new THREE.Box3().setFromObject(model)
  const exploded = new THREE.Box3()
  parts.forEach(({ object, offset }) => exploded.union(new THREE.Box3().setFromObject(object).translate(offset)))
  const bounds = assembled.clone().union(exploded)
  const radius = bounds.getBoundingSphere(new THREE.Sphere()).radius
  const floorY = bounds.min.y
  const centers = [assembled.getCenter(new THREE.Vector3()), exploded.getCenter(new THREE.Vector3())]
  scene.add(model)

  const camera = new THREE.PerspectiveCamera(28, 1, radius / 20, radius * 20)
  const distance = (radius * 0.86) / Math.sin(THREE.MathUtils.degToRad(14))
  camera.position.copy(centers[0]).addScaledVector(new THREE.Vector3(...direction).normalize(), distance)
  scene.add(camera)

  // A studio rig that travels with the camera, so every side gets the same light
  const target = new THREE.Object3D()
  target.position.copy(bounds.getCenter(new THREE.Vector3()))
  scene.add(target)

  const key = new THREE.DirectionalLight(0xfff4e8, 3)
  key.position.set(-radius * 1.6, radius * 2.6, -radius * 0.4)
  key.target = target
  key.castShadow = true
  key.shadow.mapSize.set(2048, 2048)
  Object.assign(key.shadow.camera, { left: -radius * 1.3, right: radius * 1.3, top: radius * 1.3, bottom: -radius * 1.3, near: radius * 0.2, far: radius * 8 })
  key.shadow.radius = 6
  key.shadow.bias = -0.0004
  key.shadow.normalBias = radius * 0.002
  camera.add(key)

  const rim = new THREE.DirectionalLight(0xdfe8ff, 1.4)
  rim.position.set(radius * 2, radius * 1.2, -distance * 1.6)
  rim.target = target
  camera.add(rim)
  scene.add(new THREE.HemisphereLight(0xffffff, 0x202020, 0.3))

  // Floor: a soft pool of light that fades into the stage, and the shadow on it
  const glow = document.createElement('canvas')
  glow.width = glow.height = 256
  const context = glow.getContext('2d')
  const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128)
  gradient.addColorStop(0, 'rgb(255 255 255 / 0.11)')
  gradient.addColorStop(0.55, 'rgb(255 255 255 / 0.04)')
  gradient.addColorStop(1, 'rgb(255 255 255 / 0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, 256, 256)
  const glowTexture = new THREE.CanvasTexture(glow)
  glowTexture.colorSpace = THREE.SRGBColorSpace

  const floorGeometry = new THREE.PlaneGeometry(radius * 5, radius * 5).rotateX(-Math.PI / 2)
  const pool = new THREE.Mesh(floorGeometry, new THREE.MeshBasicMaterial({ map: glowTexture, transparent: true, depthWrite: false }))
  pool.position.set(centers[0].x, floorY - radius * 0.004, centers[0].z)
  const shadow = new THREE.Mesh(floorGeometry, new THREE.ShadowMaterial({ opacity: 0.7, depthWrite: false }))
  shadow.position.copy(pool.position)
  shadow.receiveShadow = true
  scene.add(pool, shadow)
  disposables.push(glowTexture, floorGeometry, pool.material, shadow.material)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.copy(centers[0])
  controls.enableZoom = false
  controls.enablePan = false
  controls.minPolarAngle = Math.PI * 0.12
  controls.maxPolarAngle = Math.PI * 0.47
  controls.autoRotateSpeed = 0.9
  controls.update()
  // Vertical swipes still scroll the page; sideways ones turn the model
  renderer.domElement.style.touchAction = 'pan-y pinch-zoom'

  // The model is framed in what the text overlay leaves free, and kept whole at any aspect
  const resize = () => {
    const width = host.clientWidth
    const height = host.clientHeight
    const { top, bottom } = insets()
    const free = Math.max(height - top - bottom, height * 0.4)
    renderer.setSize(width, height, false)
    camera.aspect = width / free
    camera.setViewOffset(width, free, 0, -top, width, height)
    const half = Math.min(Math.atan(Math.tan(THREE.MathUtils.degToRad(14)) * Math.min(camera.aspect, 1)), THREE.MathUtils.degToRad(14))
    camera.position.sub(controls.target).setLength((radius * 0.86) / Math.sin(half)).add(controls.target)
    camera.updateProjectionMatrix()
    dirty = true
  }

  let frame = 0
  let dirty = true
  let visible = false
  let active = true
  let idle = 0
  let isExploded = false
  let transition = null
  const turntable = () => {
    controls.autoRotate = !reduced
    controls.enableDamping = !reduced
  }
  turntable()

  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

  const tick = (now) => {
    frame = requestAnimationFrame(tick)

    if (transition) {
      const elapsed = now - transition.start
      let done = true
      parts.forEach((part) => {
        const t = Math.min(Math.max((elapsed - part.delay) / 1100, 0), 1)
        done = done && t === 1
        part.object.position.lerpVectors(part.from, part.to, ease(t))
      })
      const t = ease(Math.min(elapsed / (1100 + parts.length * 45), 1))
      const center = new THREE.Vector3().lerpVectors(transition.center, transition.toCenter, t)
      camera.position.add(center.clone().sub(controls.target))
      controls.target.copy(center)
      if (done) {
        transition = null
      }
      dirty = true
    }

    if (controls.update() || dirty) {
      renderer.render(scene, camera)
      dirty = false
    }
  }

  const run = () => {
    cancelAnimationFrame(frame)
    frame = 0
    if (visible && active) {
      frame = requestAnimationFrame(tick)
    }
  }

  const setExploded = (next) => {
    if (next === isExploded) {
      return
    }

    isExploded = next
    const toCenter = centers[next ? 1 : 0]
    parts.forEach((part) => {
      part.from = part.object.position.clone()
      part.to = part.base.clone().add(next ? part.offset : new THREE.Vector3())
      part.delay = (next ? part.index : parts.length - 1 - part.index) * 45
    })

    if (reduced || !visible || !active) {
      parts.forEach((part) => part.object.position.copy(part.to))
      camera.position.add(toCenter.clone().sub(controls.target))
      controls.target.copy(toCenter)
      transition = null
      dirty = true
      return
    }

    transition = { start: performance.now(), center: controls.target.clone(), toCenter }
  }

  const onStart = () => {
    clearTimeout(idle)
    controls.autoRotate = false
  }
  const onEnd = () => {
    clearTimeout(idle)
    idle = setTimeout(turntable, 4000)
  }
  const onChange = () => { dirty = true }
  controls.addEventListener('start', onStart)
  controls.addEventListener('end', onEnd)
  controls.addEventListener('change', onChange)

  const onKey = (event) => {
    const turn = { ArrowLeft: [-TURN, 0], ArrowRight: [TURN, 0], ArrowUp: [0, -TURN], ArrowDown: [0, TURN] }[event.key]

    if (!turn) {
      return
    }

    event.preventDefault()
    onStart()
    const offset = camera.position.clone().sub(controls.target)
    const spherical = new THREE.Spherical().setFromVector3(offset)
    spherical.theta += turn[0]
    spherical.phi = THREE.MathUtils.clamp(spherical.phi + turn[1], controls.minPolarAngle, controls.maxPolarAngle)
    camera.position.copy(controls.target).add(offset.setFromSpherical(spherical))
    dirty = true
    onEnd()
  }
  host.addEventListener('keydown', onKey)

  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(host)
  const visibility = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting
    run()
  })
  visibility.observe(host)

  host.prepend(renderer.domElement)
  resize()
  renderer.render(scene, camera)

  return {
    setExploded,
    setActive: (next) => {
      active = next
      run()
    },
    setReduced: (next) => {
      reduced = next
      turntable()
    },
    dispose: () => {
      cancelAnimationFrame(frame)
      clearTimeout(idle)
      resizeObserver.disconnect()
      visibility.disconnect()
      host.removeEventListener('keydown', onKey)
      controls.dispose()
      disposables.forEach((item) => item.dispose())
      renderer.dispose()
      renderer.forceContextLoss()
      renderer.domElement.remove()
    },
  }
}

const hasWebGL = () => {
  try {
    return Boolean(document.createElement('canvas').getContext('webgl2'))
  } catch {
    return false
  }
}

const Stage = ({ piece, view }) => {
  const host = useRef(null)
  const viewer = useRef(null)
  const reduced = usePrefersReducedMotion()
  const [status, setStatus] = useState('idle')
  const [progress, setProgress] = useState(0)
  const photo = view === piece.photo.id

  // Loaded only when the band comes near, released when it unmounts
  useEffect(() => {
    const element = host.current
    let cancelled = false

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) {
        return
      }

      observer.disconnect()

      if (!hasWebGL()) {
        setStatus('unsupported')
        return
      }

      setStatus('loading')
      createViewer({
        host: element,
        url: piece.model,
        direction: piece.direction,
        explode: piece.explode,
        reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
        insets: () => {
          if (!matchMedia('(min-width: 900px)').matches) {
            return { top: 0, bottom: 0 }
          }

          const piece = element.closest('.printing__piece')
          return { top: 72, bottom: piece.querySelector('.printing__overlay').offsetHeight }
        },
        onProgress: (value) => !cancelled && setProgress(value),
      }).then((created) => {
        if (cancelled) {
          created.dispose()
          return
        }

        viewer.current = created
        setStatus('ready')
      }, () => !cancelled && setStatus('error'))
    }, { rootMargin: '800px 0px' })

    observer.observe(element)

    return () => {
      cancelled = true
      observer.disconnect()
      viewer.current?.dispose()
      viewer.current = null
    }
  }, [piece])

  useEffect(() => {
    viewer.current?.setActive(!photo)
    if (!photo) {
      viewer.current?.setExploded(view === 'exploded')
    }
  }, [photo, view, status])

  useEffect(() => {
    viewer.current?.setReduced(reduced)
  }, [reduced, status])

  const message = {
    idle: 'Loading the 3D model',
    loading: 'Loading the 3D model',
    unsupported: `This browser has no WebGL, so the 3D model can't be drawn. The photo is under ${piece.photo.label}.`,
    error: `The 3D model failed to load. The photo is under ${piece.photo.label}.`,
  }[status]

  return (
    <div className={`printing__stage is-${status}${photo ? ' is-photo' : ''}`}>
      <div
        ref={host}
        className='printing__viewer'
        tabIndex={status === 'ready' && !photo ? 0 : -1}
        role='img'
        aria-label={`${piece.title}, 3D model, ${view === 'exploded' ? 'exploded' : 'assembled'}. Drag or use the arrow keys to turn it.`}
        aria-hidden={photo}
      />
      {message && (
        <p className='printing__status' role='status'>
          <span>{message}</span>
          {status === 'loading' && (
            <span className='printing__progress' aria-hidden='true'>
              <span style={{ transform: `scaleX(${progress})` }} />
            </span>
          )}
        </p>
      )}
      <img
        src={piece.photo.src}
        alt={photo ? piece.photo.alt : ''}
        aria-hidden={!photo}
        loading='lazy'
        decoding='async'
        width={piece.photo.width}
        height={piece.photo.height}
        style={{ objectPosition: piece.photo.position }}
        className='printing__photo'
      />
    </div>
  )
}

const Piece = ({ piece }) => {
  const [view, setView] = useState('assembled')
  const views = [
    { id: 'assembled', label: 'Assembled' },
    { id: 'exploded', label: 'Exploded' },
    piece.photo,
  ]

  return (
    <article className='printing__piece' aria-labelledby={`printing-${piece.id}`}>
      <Stage piece={piece} view={view} />
      <div className='printing__overlay'>
        <Choices label={`${piece.title} view`} options={views} value={view} onChange={setView} className='choices choices--bracket' />
        <h3 id={`printing-${piece.id}`} className='printing__title'>{piece.title}</h3>
        <p className='band__body'>{piece.text}</p>
        <Tags items={piece.tags} />
      </div>
    </article>
  )
}

export const Printing = () => (
  <div className='band printing'>
    {PIECES.map((piece) => <Piece key={piece.id} piece={piece} />)}
    <p className='printing__more'>Parametric, modular parts around one rack, sharing geometry, print profile and slicing tools.</p>
  </div>
)
