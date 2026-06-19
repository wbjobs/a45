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

export type RealNumberType = 'algebraic' | 'transcendental' | 'liouville'

export interface RealNumberInfo {
  value: number
  type: RealNumberType
  typeDescription: string
  isLiouville: boolean
  liouvilleDigit?: 0 | 1
  liouvillePosition?: string
  confidence: number
  explanation: string
}

export interface OceanParticle {
  id: number
  x: number
  y: number
  z: number
  value: number
  type: RealNumberType
}

export interface OceanPointQuery {
  value: number
  range: number
}

export interface OceanQueryResult {
  centerValue: number
  range: number
  liouvilleChecks: Array<{ position: string; digit: 0 | 1; isFactorial: boolean }>
  dominantType: RealNumberType
  explanation: string
  transcendentalDensity: number
  algebraicDensity: number
  liouvilleCount: number
}

export type ProgressListener = (info: ProgressInfo) => void

declare global {
  interface Window {
    liouvilleAPI: {
      checkDigit: (position: string) => Promise<LiouvilleResult>
      calculateDensity: (totalBits: string, numRanges: number) => Promise<DensityDataPoint[]>
      generateSpiral: (totalBits: string, pointsPerRotation: number) => Promise<SpiralDataPoint[]>
      generateSequence: (start: string, length: number) => Promise<DigitSequencePoint[]>
      classifyRealNumber: (value: number) => Promise<RealNumberInfo>
      generateOceanParticles: (
        count: number,
        bounds: { minX: number; maxX: number; minY: number; maxY: number }
      ) => Promise<OceanParticle[]>
      queryOceanPoint: (query: OceanPointQuery) => Promise<OceanQueryResult>
      onCheckDigitProgress: (listener: ProgressListener) => () => void
      onCalculateDensityProgress: (listener: ProgressListener) => () => void
      onGenerateSpiralProgress: (listener: ProgressListener) => () => void
      onGenerateSequenceProgress: (listener: ProgressListener) => () => void
      onGenerateOceanProgress: (listener: ProgressListener) => () => void
      onQueryOceanProgress: (listener: ProgressListener) => () => void
    }
  }
}

export {}
