import { contextBridge, ipcRenderer } from 'electron'

export interface LiouvilleResult {
  position: string
  digit: 0 | 1
  factorialIndex?: string
  nearestFactorials: Array<{ k: string; value: string }>
  factorialsUpToPosition: Array<{ k: string; value: string }>
}

export interface DensityDataPoint {
  rangeStart: string
  rangeEnd: string
  count: number
  density: number
}

export interface SpiralDataPoint {
  position: string
  isOne: boolean
  angle: number
  radius: number
  x: number
  y: number
}

export interface DigitSequencePoint {
  position: string
  digit: 0 | 1
}

const api = {
  checkDigit: (position: string): Promise<LiouvilleResult> =>
    ipcRenderer.invoke('check-digit', position),

  calculateDensity: (totalBits: string, numRanges: number): Promise<DensityDataPoint[]> =>
    ipcRenderer.invoke('calculate-density', totalBits, numRanges),

  generateSpiral: (totalBits: string, pointsPerRotation: number): Promise<SpiralDataPoint[]> =>
    ipcRenderer.invoke('generate-spiral', totalBits, pointsPerRotation),

  generateSequence: (start: string, length: number): Promise<DigitSequencePoint[]> =>
    ipcRenderer.invoke('generate-sequence', start, length)
}

contextBridge.exposeInMainWorld('liouvilleAPI', api)

export type LiouvilleAPI = typeof api
