// The lobby's crowd, after the game's hall NPC system: spectators walk in on baked frames, queue when
// the screen room is big enough, pay at the counter and leave through the curtain.

const FRAME_MS = 125
const IN_FRAMES = 17
const OUT_FRAMES = 13
const COUNTER_FRAME = IN_FRAMES - 1
const QUEUE_FRONT_FRAME = 7
const MAX_QUEUE = 8
export const NPC_COUNT = 6
export const CURTAIN_FRAMES = 6
const CURTAIN_MS = 80
const PICKUP_MS = 950

const between = ([min, max]) => min + Math.random() * (max - min)

export const createHall = () => ({
  npcs: [],
  queue: [],
  counter: null,
  arriving: null,
  nextSpawn: 0,
  curtainAt: -Infinity,
  pickups: [],
  bag: [],
})

const pickIndex = (hall) => {
  const busy = new Set(hall.npcs.map((npc) => npc.idx))

  if (!hall.bag.length) {
    hall.bag = Array.from({ length: NPC_COUNT }, (_, i) => i).sort(() => Math.random() - 0.5)
  }

  const at = hall.bag.findIndex((idx) => !busy.has(idx))
  return at === -1 ? null : hall.bag.splice(at, 1)[0]
}

const walk = (npc, now, target, then) => {
  npc.target = target
  npc.stepAt = now + FRAME_MS
  npc.then = then
}

const arrive = (hall, npc, now) => {
  hall.arriving = npc
  walk(npc, now, COUNTER_FRAME, 'counter')
}

const advance = (hall, now) => {
  const front = hall.queue.shift()

  if (!front) {
    return
  }

  arrive(hall, front, now)
  hall.queue.forEach((npc) => walk(npc, now, npc.frame + 1, 'wait'))
}

const spawn = (hall, now, crowd) => {
  const busy = hall.counter || hall.arriving

  if (hall.npcs.length >= crowd.cap || (busy && !crowd.queueing) || hall.queue.length >= MAX_QUEUE) {
    return
  }

  const idx = pickIndex(hall)

  if (idx === null) {
    return
  }

  const npc = { idx, sheet: 'in', frame: 0 }
  hall.npcs.push(npc)

  if (crowd.queueing) {
    walk(npc, now, QUEUE_FRONT_FRAME - hall.queue.length, 'queue')
    hall.queue.push(npc)

    if (npc.target === npc.frame) {
      reached(hall, npc, now)
    }
  } else {
    arrive(hall, npc, now)
  }
}

const reached = (hall, npc, now, cashier) => {
  if (npc.then === 'queue' && !hall.counter && !hall.arriving) {
    advance(hall, now)
  } else if (npc.then === 'counter') {
    hall.arriving = null
    hall.counter = npc
    npc.leaveAt = now + between(cashier)
  } else if (npc.then === 'gone') {
    hall.npcs = hall.npcs.filter((other) => other !== npc)
  }
}

const leave = (hall, npc, now, popcornShare) => {
  hall.counter = null
  npc.leaveAt = undefined
  npc.sheet = 'out'
  npc.frame = 0
  walk(npc, now, OUT_FRAMES - 1, 'gone')
  npc.puffAt = now + (OUT_FRAMES - 3) * FRAME_MS

  hall.pickups.push({ icon: 'ticket', at: now })

  if (Math.random() < popcornShare) {
    hall.pickups.push({ icon: 'popcorn', at: now + 220 })
  }

  advance(hall, now)
}

export const stepHall = (hall, now, { crowd, cashier, popcornShare }) => {
  if (crowd.cap > 0 && now >= hall.nextSpawn) {
    spawn(hall, now, crowd)
    hall.nextSpawn = now + between(crowd.spawnDelay)
  }

  for (const npc of [...hall.npcs]) {
    while (npc.frame !== npc.target && now >= npc.stepAt) {
      npc.frame += 1
      npc.stepAt += FRAME_MS

      if (npc.frame === npc.target) {
        reached(hall, npc, now, cashier)
      }
    }

    if (npc.puffAt && now >= npc.puffAt) {
      npc.puffAt = undefined

      if (now - hall.curtainAt > CURTAIN_FRAMES * CURTAIN_MS) {
        hall.curtainAt = now
      }
    }

    if (hall.counter === npc && now >= npc.leaveAt) {
      leave(hall, npc, now, popcornShare)
    }
  }

  hall.pickups = hall.pickups.filter((pickup) => now - pickup.at < PICKUP_MS)
}

export const curtainFrame = (hall, now) => {
  const frame = Math.floor((now - hall.curtainAt) / CURTAIN_MS)
  return frame >= 0 && frame < CURTAIN_FRAMES ? frame : 0
}

// Rising +1 icons above the spectator who just paid, the game's pickup effect
export const pickupsOf = (hall, now) => hall.pickups
  .filter((pickup) => now >= pickup.at)
  .map((pickup) => {
    const t = (now - pickup.at) / PICKUP_MS
    return { icon: pickup.icon, x: 48, y: 75 - 32 * (1 - (1 - t) ** 3), alpha: t < 0.62 ? 1 : 1 - (t - 0.62) / 0.38 }
  })

// Where each sheet's frames sit in the 192 px room, anchored as the game anchors them
export const npcFrame = (npc) => {
  const sheet = npc.sheet === 'in'
    ? { w: 128, h: 112, x: 0, y: 192 - 112 }
    : { w: 112, h: 112, x: 186 - 112, y: 179 - 112 }
  const index = npc.idx * 18 + npc.frame

  return { ...sheet, sx: (index % 6) * sheet.w, sy: Math.floor(index / 6) * sheet.h }
}

// Reduced motion: one spectator standing at the counter
export const stillNpc = { idx: 0, sheet: 'in', frame: COUNTER_FRAME }
