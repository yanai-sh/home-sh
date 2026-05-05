const BYTE_LENGTH = 32;
const FLOATS = {
  mouseX: 0,
  mouseY: 1,
  scrollVx: 2,
  tiltX: 3,
  tiltY: 4,
  tickTarget: 5,
} as const;
const UINTS = {
  frameCounter: 6,
} as const;

export interface SharedStateWriters {
  setMouse(x: number, y: number): void;
  setScrollVelocity(vx: number): void;
  setTilt(x: number, y: number): void;
  setTickTarget(hz: number): void;
  incrementFrameCounter(): number;
  readFrameCounter(): number;
}

export interface SharedStateHandle {
  sab: SharedArrayBuffer;
  writers: SharedStateWriters;
}

export function createSharedState(): SharedStateHandle {
  if (!globalThis.crossOriginIsolated) {
    throw new Error(
      'crossOriginIsolated is false; COOP/COEP headers are required for SharedArrayBuffer',
    );
  }

  if (typeof SharedArrayBuffer === 'undefined') {
    throw new Error('SharedArrayBuffer is unavailable; check COOP/COEP headers for /workspace/*');
  }

  const sab = new SharedArrayBuffer(BYTE_LENGTH);
  const floats = new Float32Array(sab);
  const uints = new Uint32Array(sab);

  floats[FLOATS.tickTarget] = matchMedia('(pointer: coarse)').matches ? 30 : 60;

  return {
    sab,
    writers: {
      setMouse(x, y) {
        floats[FLOATS.mouseX] = x;
        floats[FLOATS.mouseY] = y;
      },
      setScrollVelocity(vx) {
        floats[FLOATS.scrollVx] = vx;
      },
      setTilt(x, y) {
        floats[FLOATS.tiltX] = x;
        floats[FLOATS.tiltY] = y;
      },
      setTickTarget(hz) {
        floats[FLOATS.tickTarget] = hz;
      },
      incrementFrameCounter() {
        uints[UINTS.frameCounter] += 1;
        return uints[UINTS.frameCounter];
      },
      readFrameCounter() {
        return uints[UINTS.frameCounter];
      },
    },
  };
}
