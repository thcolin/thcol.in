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
    id: 'honshu',
    name: 'HONSHU',
    kanji: '本州',
    kana: 'ホンシュウ',
    rgb: '200 224 96',
    plate: 'RACK · 3 MACHINES',
    model: new URL('./models/honshu.bin', import.meta.url).href,
    focal: 'HONSHU · 本州',
    hero: { value: '214', unit: 'W', label: 'TOTAL POWER · EST.' },
    power: [['KYOTO', 58], ['TOKYO', 41], ['AKIHABARA', 115]],
  },
  {
    id: 'kyoto',
    name: 'KYOTO',
    kanji: '京都',
    kana: 'キョウト',
    rgb: '255 176 56',
    plate: 'NAS · 8 BAYS · ↑ 31D 04:12',
    status: 'warn',
    alert: 'D3 47°C · DISK RUNNING HOT',
    model: new URL('./models/kyoto.bin', import.meta.url).href,
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
    id: 'tokyo',
    name: 'TOKYO',
    kanji: '東京',
    kana: 'トウキョウ',
    rgb: '96 240 140',
    plate: 'OPTIPLEX 3060 · DOCKER · ↑ 12D 06:40',
    model: new URL('./models/tokyo.bin', import.meta.url).href,
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
    id: 'akihabara',
    name: 'AKIHABARA',
    kanji: '秋葉原',
    kana: 'アキハバラ',
    rgb: '104 200 255',
    plate: 'GAMING · RX 6700 XT · ↑ 2D 01:18',
    model: new URL('./models/akihabara.bin', import.meta.url).href,
    focal: 'GPU · 演算',
    hero: { value: '88', unit: '%', label: 'GPU LOAD' },
    cpu: { load: 48, temp: 61, cores: [52, 44, 61, 38, 47, 55], freq: '5.1 GHz' },
    mem: { pct: 54, used: 17.3, total: 32 },
    net: { down: '240 Mbps', up: '92 Mbps', history: series(40, 31, 24, 26), ulHistory: series(40, 37, 9, 12) },
    gpu: { load: 88, temp: 71, vram: 9.2, vramTotal: 12, clock: '2550 MHz', power: '186 W' },
    volumes: [['NVMe', 73], ['SSD1', 61], ['SSD2', 48]],
  },
]

// The sample moves: a slow sine per metric plus a little jitter, read at `t` seconds. An alert
// comes and goes on its own (a disk warming up on the NAS, a container restarting on the server)
const wave = (t, period, phase = 0) => Math.sin((t / period) * Math.PI * 2 + phase)
const jitter = (t, seed) => Math.sin(t * 12.9898 + seed * 78.233) * 0.5
const pct = (value) => Math.max(0, Math.min(100, Math.round(value)))
const clock = (base, t) => {
  const [days, rest] = base.split('D ')
  const [hours, minutes] = rest.split(':').map(Number)
  const total = (Number(days) * 24 + hours) * 60 + minutes + Math.floor(t / 60)
  return `${Math.floor(total / 1440)}D ${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

const UPTIME = { kyoto: '31D 04:12', tokyo: '12D 06:40', akihabara: '2D 01:18' }

export const liveHistory = (base, t, seed) => base.map((value, index) => pct(value + 14 * wave(t + index * 1.5, 9, seed) + 8 * jitter(t + index, seed)))

export const livePage = (page, t) => {
  if (!page.cpu) {
    const power = page.power.map(([name, watts], index) => [name, Math.round(watts * (1 + 0.08 * wave(t, 13, index)))])
    const total = power.reduce((sum, [, watts]) => sum + watts, 0)
    return { ...page, power, hero: { ...page.hero, value: String(total) } }
  }

  const seed = page.id.length
  const step = Math.floor(t)
  const cpu = {
    ...page.cpu,
    load: pct(page.cpu.load + 12 * wave(t, 17, seed) + 6 * jitter(step, seed)),
    temp: Math.round(page.cpu.temp + 3 * wave(t, 23, seed)),
    cores: page.cpu.cores.map((value, index) => pct(value + 18 * wave(t, 7 + index, index) + 8 * jitter(step, index))),
  }
  const mem = { ...page.mem, pct: pct(page.mem.pct + 4 * wave(t, 41, seed)) }
  mem.used = Math.round((mem.pct / 100) * page.mem.total * 10) / 10
  const net = {
    ...page.net,
    history: liveHistory(page.net.history, step, seed),
    ulHistory: liveHistory(page.net.ulHistory, step, seed + 3),
    down: `${Math.round(Number.parseInt(page.net.down, 10) * (1 + 0.3 * wave(t, 11, seed)))} Mbps`,
    up: `${Math.round(Number.parseInt(page.net.up, 10) * (1 + 0.3 * wave(t, 13, seed)))} Mbps`,
  }
  const plate = page.plate.replace(/↑ .*$/, `↑ ${clock(UPTIME[page.id], t)}`)
  const live = { ...page, cpu, mem, net, plate }

  if (page.id === 'kyoto') {
    const d3 = Math.round(44 + 4 * wave(t, 40))
    const hot = d3 > 45
    live.disks = page.disks.map((disk) => disk.temp === null ? disk : disk.bay === 3 ? { ...disk, temp: d3, status: hot ? 'warn' : undefined } : { ...disk, temp: Math.round(disk.temp + wave(t, 30, disk.bay)) })
    live.status = hot ? 'warn' : undefined
    live.alert = hot ? `D3 ${d3}°C · DISK RUNNING HOT` : null
    const hottest = live.disks.reduce((best, disk) => disk.temp !== null && disk.temp > (best?.temp ?? 0) ? disk : best, null)
    live.hero = { value: String(hottest.temp), unit: '°', label: `HOTTEST · D${hottest.bay}`, status: hot ? 'warn' : undefined }
  }

  if (page.id === 'tokyo') {
    const restarting = t % 60 >= 38 && t % 60 < 52
    const up = page.containers.up - (restarting ? 1 : 0)
    live.containers = { up, idle: page.containers.idle }
    live.status = restarting ? 'warn' : undefined
    live.alert = restarting ? 'CONTAINER RESTARTING · 12/14 UP' : null
    live.hero = { value: `${up}/${up + page.containers.idle + (restarting ? 1 : 0)}`, label: restarting ? 'ONE CONTAINER DOWN' : 'CONTAINERS UP', status: restarting ? 'warn' : undefined }
    live.streams = page.streams.map((stream, index) => ({ ...stream, pct: Math.min(100, Math.round(stream.pct + (t / 6) * (index + 1)) % 100) }))
  }

  if (page.id === 'akihabara') {
    const load = pct(page.gpu.load + 8 * wave(t, 9, 2) + 4 * jitter(step, 9))
    live.gpu = { ...page.gpu, load, temp: Math.round(page.gpu.temp + 4 * wave(t, 21, 1)) }
    live.hero = { ...page.hero, value: String(load) }
  }

  return live
}
