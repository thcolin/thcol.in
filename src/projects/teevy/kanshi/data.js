// Sample data, shaped like Kanshi's collector output: plausible values, none of them read from a machine
const series = (length, seed, base, amplitude) => {
  const out = []
  let x = seed

  for (let i = 0; i < length; i++) {
    x = (x * 1103515245 + 12345) & 0x7fffffff
    out.push(Math.max(0, Math.min(100, Math.round(base + ((x / 0x7fffffff) * 2 - 1) * amplitude))))
  }

  return out
}

export const PAGES = [
  {
    id: 'rack',
    name: 'RACK',
    jp: '設備',
    rgb: '200 224 96',
    plate: 'RACK · 3 MACHINES',
    model: new URL('./models/rack.bin', import.meta.url).href,
    focal: 'RACK · 設備',
    hero: { value: '214', unit: 'W', label: 'RACK POWER · EST.' },
    power: [['BABYLON', 58], ['CORTEX', 41], ['CHROMA', 115]],
  },
  {
    id: 'babylon',
    name: 'BABYLON',
    jp: '貯蔵',
    rgb: '255 176 56',
    plate: 'NAS · 8 BAYS · ↑ 31D 04:12',
    status: 'warn',
    alert: 'D3 47°C · DISK RUNNING HOT',
    model: new URL('./models/babylon.bin', import.meta.url).href,
    focal: 'BAYS · 貯蔵',
    hero: { value: '47', unit: '°', label: 'HOTTEST · D3', status: 'warn' },
    cpu: { load: 22, temp: 48, cores: [24, 18, 27, 19], freq: '2.1 GHz' },
    mem: { pct: 61, used: 4.9, total: 8 },
    net: { down: '180 Mbps', up: '42 Mbps', history: series(40, 7, 18, 16), ulHistory: series(40, 11, 8, 7) },
    disks: [
      { bay: 1, model: 'WD40EFRX', temp: 35 },
      { bay: 2, model: 'WD40EFRX', temp: 36 },
      { bay: 3, model: 'ST4000VN008', temp: 47, status: 'warn' },
      { bay: 4, model: 'ST4000VN008', temp: 38 },
      { bay: 5, model: 'HAT5300-8T', temp: 39 },
      { bay: 6, model: 'HAT5300-8T', temp: 34 },
      { bay: 7, model: 'WD60EFAX', temp: 35 },
      { bay: 8, model: null, temp: null },
    ],
    storage: { pct: 58, label: 'VOLUME 1 · SHR', free: '12.4 TB' },
  },
  {
    id: 'cortex',
    name: 'CORTEX',
    jp: '核',
    rgb: '96 240 140',
    plate: 'OPTIPLEX 3060 · DOCKER · ↑ 12D 06:40',
    model: new URL('./models/cortex.bin', import.meta.url).href,
    focal: 'DOCKER · 核',
    hero: { value: '13/14', label: 'CONTAINERS UP' },
    cpu: { load: 35, temp: 52, cores: [38, 29, 41, 33, 27, 36], freq: '3.0 GHz' },
    mem: { pct: 47, used: 7.5, total: 16 },
    net: { down: '410 Mbps', up: '224 Mbps', history: series(40, 19, 40, 34), ulHistory: series(40, 23, 22, 20) },
    containers: { up: 13, idle: 1 },
    storage: { pct: 44, label: 'DOCKER · SSD', free: '1.1 TB' },
    streams: [
      { user: 'alex', title: 'Blade Runner 2049', mode: 'DIRECT', pct: 47 },
      { user: 'sam', title: 'Arcane · S02E01', mode: 'TRANSCODE', pct: 12 },
    ],
  },
  {
    id: 'chroma',
    name: 'CHROMA',
    jp: '演算',
    rgb: '104 200 255',
    plate: 'GAMING · RX 6700 XT · ↑ 2D 01:18',
    model: new URL('./models/chroma.bin', import.meta.url).href,
    focal: 'GPU · 演算',
    hero: { value: '88', unit: '%', label: 'GPU LOAD' },
    cpu: { load: 48, temp: 61, cores: [52, 44, 61, 38, 47, 55], freq: '5.1 GHz' },
    mem: { pct: 54, used: 17.3, total: 32 },
    net: { down: '240 Mbps', up: '92 Mbps', history: series(40, 31, 24, 26), ulHistory: series(40, 37, 9, 12) },
    gpu: { load: 88, temp: 71, vram: 9.2, vramTotal: 12, clock: '2550 MHz', power: '186 W' },
    volumes: [['NVMe', 73], ['SSD1', 61], ['SSD2', 48]],
  },
]
