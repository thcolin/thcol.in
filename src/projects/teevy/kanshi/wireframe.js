import * as THREE from 'three'
import { acquireRenderer, releaseRenderer } from '../gl'

// Kanshi's Device3D: the real machine as a 1px see-through wireframe, orthographic 3/4 view.
// The edges are baked offline from teevy's models (EdgesGeometry, same thresholds), as Int16.
const edges = new Map()

const load = (url) => {
  if (!edges.has(url)) {
    edges.set(url, fetch(url)
      .then((response) => response.arrayBuffer())
      .then((buffer) => {
        const packed = new Int16Array(buffer)
        const positions = new Float32Array(packed.length)

        for (let i = 0; i < packed.length; i++) {
          positions[i] = packed[i] / 65534
        }

        const geometry = new THREE.BufferGeometry()
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
        geometry.computeBoundingBox()
        return geometry
      }))
  }

  return edges.get(url)
}

// Containers drawn as cells on the flank of the server, as teevy does
const matrix = ({ pos, cols, cell, gap, colors }) => {
  const geometry = new THREE.PlaneGeometry(cell, cell)
  const materials = []
  const meshes = colors.map((color, index) => {
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.92, side: THREE.DoubleSide, toneMapped: false })
    const mesh = new THREE.Mesh(geometry, material)
    const rows = Math.ceil(colors.length / cols)
    const dx = ((index % cols) - (cols - 1) / 2) * (cell + gap)
    const dy = ((rows - 1) / 2 - Math.floor(index / cols)) * (cell + gap)
    mesh.position.set(pos[0], pos[1] + dy, pos[2] + dx)
    mesh.rotation.y = Math.PI / 2
    materials.push(material)
    return mesh
  })

  return { meshes, dispose: () => [geometry, ...materials].forEach((item) => item.dispose()) }
}

export const mountWireframe = (host, { url, color, spin, margin = 1.08, addon }) => {
  const renderer = acquireRenderer()
  const canvas = renderer.domElement
  canvas.className = 'kanshi__canvas'
  host.appendChild(canvas)

  const scene = new THREE.Scene()
  const group = new THREE.Group()
  scene.add(group)

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -10, 10)
  camera.position.copy(new THREE.Vector3(0.62, 0.42, 1.4).normalize().multiplyScalar(4))
  camera.lookAt(0, 0, 0)

  const view = camera.position.clone().negate().normalize()
  const right = new THREE.Vector3().crossVectors(view, new THREE.Vector3(0, 1, 0)).normalize()
  const up = new THREE.Vector3().crossVectors(right, view).normalize()

  const material = new THREE.LineBasicMaterial({ color, transparent: true, toneMapped: false })
  const cells = addon ? matrix(addon) : null
  let extent = { x: 0.6, y: 0.6 }
  let disposed = false
  let raf = 0
  const start = performance.now()

  const fit = () => {
    const width = host.clientWidth
    const height = host.clientHeight

    if (!width || !height) {
      return
    }

    renderer.setSize(width, height, false)
    const aspect = width / height
    const half = Math.max(extent.y, extent.x / aspect) * margin
    camera.top = half
    camera.bottom = -half
    camera.left = -half * aspect
    camera.right = half * aspect
    camera.updateProjectionMatrix()
  }

  const render = () => {
    if (spin) {
      group.rotation.y = ((performance.now() - start) / 1000) * 0.125
    }

    renderer.render(scene, camera)
  }

  const tick = () => {
    if (disposed) {
      return
    }

    render()
    raf = requestAnimationFrame(tick)
  }

  const observer = new ResizeObserver(() => {
    fit()
    render()
  })
  observer.observe(host)
  fit()
  renderer.render(scene, camera)

  load(url).then((geometry) => {
    if (disposed) {
      return
    }

    // Contain the model over a full turn, so it fills the frame and never crosses it
    const box = geometry.boundingBox
    const corners = []
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) corners.push(new THREE.Vector3(x, y, z))
    const turn = new THREE.Matrix4()
    const point = new THREE.Vector3()
    extent = { x: 0, y: 0 }

    for (let i = 0; i < 48; i++) {
      turn.makeRotationY((i / 48) * Math.PI * 2)

      for (const corner of corners) {
        point.copy(corner).applyMatrix4(turn)
        extent.x = Math.max(extent.x, Math.abs(point.dot(right)))
        extent.y = Math.max(extent.y, Math.abs(point.dot(up)))
      }
    }

    group.add(new THREE.LineSegments(geometry, material))
    cells?.meshes.forEach((mesh) => group.add(mesh))
    group.rotation.y = spin ? 0 : -0.5
    fit()

    if (spin) {
      tick()
    } else {
      render()
    }
  }).catch(() => {})

  return {
    color: (value) => {
      material.color.set(value)
      if (!spin) render()
    },
    dispose: () => {
      disposed = true
      cancelAnimationFrame(raf)
      observer.disconnect()
      material.dispose()
      cells?.dispose()
      group.clear()

      if (canvas.parentNode === host) {
        host.removeChild(canvas)
      }

      canvas.className = ''
      releaseRenderer(renderer)
    },
  }
}
