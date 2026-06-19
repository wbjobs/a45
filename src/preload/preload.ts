import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'

export interface ProgressInfo {
  progress: number
  percentage: number
  message: string
  done?: boolean
  error?: string
}

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

export type ProgressListener = (info: ProgressInfo) => void

export interface LiouvilleAPI {
  checkDigit: (position: string) => Promise<LiouvilleResult>
  calculateDensity: (totalBits: string, numRanges: number) => Promise<DensityDataPoint[]>
  generateSpiral: (totalBits: string, pointsPerRotation: number) => Promise<SpiralDataPoint[]>
  generateSequence: (start: string, length: number) => Promise<DigitSequencePoint[]>
  onCheckDigitProgress: (listener: ProgressListener) => () => void
  onCalculateDensityProgress: (listener: ProgressListener) => () => void
  onGenerateSpiralProgress: (listener: ProgressListener) => () => void
  onGenerateSequenceProgress: (listener: ProgressListener) => () => void
}

function createProgressListener(channel: string) {
  return (listener: ProgressListener): (() => void) => {
    const handler = (_event: IpcRendererEvent, info: ProgressInfo) => {
      listener(info)
    }
    ipcRenderer.on(channel, handler)
    return () => {
      ipcRenderer.removeListener(channel, handler)
    }
  }
}

const api: LiouvilleAPI = {
  checkDigit: (position: string): Promise<LiouvilleResult> =>
    ipcRenderer.invoke('check-digit', position),

  calculateDensity: (totalBits: string, numRanges: number): Promise<DensityDataPoint[]> =>
    ipcRenderer.invoke('calculate-density', totalBits, numRanges),

  generateSpiral: (totalBits: string, pointsPerRotation: number): Promise<SpiralDataPoint[]> =>
    ipcRenderer.invoke('generate-spiral', totalBits, pointsPerRotation),

  generateSequence: (start: string, length: number): Promise<DigitSequencePoint[]> =>
    ipcRenderer.invoke('generate-sequence', start, length),

  onCheckDigitProgress: createProgressListener('check-digit-progress'),
  onCalculateDensityProgress: createProgressListener('calculate-density-progress'),
  onGenerateSpiralProgress: createProgressListener('generate-spiral-progress'),
  onGenerateSequenceProgress: createProgressListener('generate-sequence-progress')
}

contextBridge.exposeInMainWorld('liouvilleAPI', api)
