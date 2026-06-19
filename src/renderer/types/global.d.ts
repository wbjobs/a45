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

declare global {
  interface Window {
    liouvilleAPI: {
      checkDigit: (position: string) => Promise<LiouvilleResult>
      calculateDensity: (totalBits: string, numRanges: number) => Promise<DensityDataPoint[]>
      generateSpiral: (totalBits: string, pointsPerRotation: number) => Promise<SpiralDataPoint[]>
      generateSequence: (start: string, length: number) => Promise<DigitSequencePoint[]>
      onCheckDigitProgress: (listener: ProgressListener) => () => void
      onCalculateDensityProgress: (listener: ProgressListener) => () => void
      onGenerateSpiralProgress: (listener: ProgressListener) => () => void
      onGenerateSequenceProgress: (listener: ProgressListener) => () => void
    }
  }
}

export {}
