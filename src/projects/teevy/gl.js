import * as THREE from 'three'

// teevy keeps its WebGL contexts alive between screens; here they are freed once the band leaves
const pool = []

export const acquireRenderer = () => {
  const renderer = pool.pop()

  if (renderer) {
    return renderer
  }

  const created = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  created.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  created.setClearAlpha(0)
  return created
}

export const releaseRenderer = (renderer) => {
  pool.push(renderer)
}

export const drainRenderers = () => {
  while (pool.length) {
    const renderer = pool.pop()
    renderer.dispose()
    renderer.forceContextLoss()
  }
}

// The boot screens were framed for a 4:3 tube. On the band, the scene fills everything while the
// camera keeps that 4:3 framing inside the zone right of the guide (`.teevy-boot__zone`)
export const frameCamera = (camera, host, width, height, halfHeight = 1) => {
  const zone = host.closest('.teevy-boot')?.querySelector('.teevy-boot__zone')

  if (!zone) {
    return
  }

  const box = zone.getBoundingClientRect()
  const origin = host.getBoundingClientRect()
  const frameW = Math.min(box.width, (box.height * 4) / 3)
  const frameH = (frameW * 3) / 4
  const cx = box.left - origin.left + box.width / 2
  const cy = box.top - origin.top + box.height / 2

  if (camera.isOrthographicCamera) {
    camera.left = (-halfHeight * 4) / 3
    camera.right = (halfHeight * 4) / 3
    camera.top = halfHeight
    camera.bottom = -halfHeight
  } else {
    camera.aspect = 4 / 3
  }

  camera.setViewOffset(frameW, frameH, -(cx - frameW / 2), -(cy - frameH / 2), width, height)
  camera.updateProjectionMatrix()
}
