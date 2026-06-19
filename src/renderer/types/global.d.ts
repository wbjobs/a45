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

declare global {
  interface Window {
    liouvilleAPI: {
      checkDigit: (position: string) => Promise<LiouvilleResult>
      calculateDensity: (totalBits: string, numRanges: number) => Promise<DensityDataPoint[]>
      generateSpiral: (totalBits: string, pointsPerRotation: number) => Promise<SpiralDataPoint[]>
      generateSequence: (start: string, length: number) => Promise<DigitSequencePoint[]>
    }
  }
}

export {}
