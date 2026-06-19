export interface LiouvilleResult {
  position: bigint
  digit: 0 | 1
  factorialIndex?: bigint
  nearestFactorials: Array<{ k: bigint; value: bigint }>
  factorialsUpToPosition: Array<{ k: bigint; value: bigint }>
}

export interface DensityDataPoint {
  rangeStart: bigint
  rangeEnd: bigint
  count: number
  density: number
}

export interface SpiralDataPoint {
  position: bigint
  isOne: boolean
  angle: number
  radius: number
  x: number
  y: number
}

function factorial(k: bigint): bigint {
  let result = 1n
  for (let i = 1n; i <= k; i++) {
    result *= i
  }
  return result
}

function findFactorialIndex(n: bigint): bigint | null {
  if (n < 1n) return null
  
  let k = 1n
  let fact = 1n
  
  while (fact < n) {
    k++
    const nextFact = fact * k
    if (nextFact < fact) {
      return null
    }
    fact = nextFact
  }
  
  return fact === n ? k : null
}

function getFactorialsUpTo(n: bigint): Array<{ k: bigint; value: bigint }> {
  const result: Array<{ k: bigint; value: bigint }> = []
  let k = 1n
  let fact = 1n
  
  while (fact <= n) {
    result.push({ k, value: fact })
    k++
    const nextFact = fact * k
    if (nextFact < fact || nextFact < k) {
      break
    }
    fact = nextFact
  }
  
  return result
}

function getNearestFactorials(n: bigint): Array<{ k: bigint; value: bigint }> {
  const allFactorials = getFactorialsUpTo(n * 1000n)
  const result: Array<{ k: bigint; value: bigint }> = []
  
  for (const fact of allFactorials) {
    if (fact.value <= n || result.length < 2) {
      result.push(fact)
    } else {
      result.push(fact)
      break
    }
  }
  
  if (result.length < 2) {
    return allFactorials.slice(0, 3)
  }
  
  return result.slice(-3)
}

export function checkLiouvilleDigit(n: bigint): LiouvilleResult {
  if (n < 1n) {
    throw new Error('位置必须是正整数')
  }
  
  const factorialIndex = findFactorialIndex(n)
  const digit: 0 | 1 = factorialIndex !== null ? 1 : 0
  
  return {
    position: n,
    digit,
    factorialIndex: factorialIndex ?? undefined,
    nearestFactorials: getNearestFactorials(n),
    factorialsUpToPosition: getFactorialsUpTo(n)
  }
}

export function calculateDensity(
  totalBits: bigint,
  numRanges: number = 100
): DensityDataPoint[] {
  if (totalBits < 1n || numRanges < 1) {
    throw new Error('参数必须为正')
  }
  
  const rangeSize = totalBits / BigInt(numRanges)
  if (rangeSize < 1n) {
    throw new Error('范围数量过多，请减少范围数量或增加总位数')
  }
  
  const allFactorials = getFactorialsUpTo(totalBits)
  const result: DensityDataPoint[] = []
  
  for (let i = 0; i < numRanges; i++) {
    const rangeStart = BigInt(i) * rangeSize + 1n
    const rangeEnd = i === numRanges - 1 ? totalBits : BigInt(i + 1) * rangeSize
    
    let count = 0
    for (const fact of allFactorials) {
      if (fact.value >= rangeStart && fact.value <= rangeEnd) {
        count++
      }
    }
    
    const rangeSizeNum = Number(rangeEnd - rangeStart + 1n)
    result.push({
      rangeStart,
      rangeEnd,
      count,
      density: count / rangeSizeNum
    })
  }
  
  return result
}

export function generateSpiralData(
  totalBits: bigint,
  pointsPerRotation: number = 360
): SpiralDataPoint[] {
  if (totalBits < 1n) {
    throw new Error('位数必须为正')
  }
  
  const allFactorials = getFactorialsUpTo(totalBits)
  const factorialSet = new Set(allFactorials.map(f => f.value.toString()))
  
  const result: SpiralDataPoint[] = []
  const totalBitsNum = Number(totalBits)
  
  for (let i = 1; i <= Math.min(totalBitsNum, 10000); i++) {
    const position = BigInt(i)
    const isOne = factorialSet.has(position.toString())
    
    const progress = i / totalBitsNum
    const angle = progress * pointsPerRotation * 2 * Math.PI
    const radius = 10 + progress * 90
    
    result.push({
      position,
      isOne,
      angle,
      radius,
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle)
    })
  }
  
  return result
}

export function generateDigitSequence(start: bigint, length: number): Array<{ position: bigint; digit: 0 | 1 }> {
  if (start < 1n || length < 1) {
    throw new Error('参数必须为正')
  }
  
  const allFactorials = getFactorialsUpTo(start + BigInt(length))
  const factorialSet = new Set(allFactorials.map(f => f.value.toString()))
  
  const result: Array<{ position: bigint; digit: 0 | 1 }> = []
  
  for (let i = 0n; i < BigInt(length); i++) {
    const pos = start + i
    const digit: 0 | 1 = factorialSet.has(pos.toString()) ? 1 : 0
    result.push({ position: pos, digit })
  }
  
  return result
}
