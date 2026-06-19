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

export interface ProgressCallback {
  (progress: number, message: string): void
}

export type RealNumberType = 'algebraic' | 'transcendental' | 'liouville'

export interface RealNumberInfo {
  value: number
  type: RealNumberType
  typeDescription: string
  isLiouville: boolean
  liouvilleDigit?: 0 | 1
  liouvillePosition?: bigint
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
  liouvilleChecks: Array<{ position: bigint; digit: 0 | 1; isFactorial: boolean }>
  dominantType: RealNumberType
  explanation: string
  transcendentalDensity: number
  algebraicDensity: number
  liouvilleCount: number
}

const LN_2PI = Math.log(2 * Math.PI)

function stirlingLogFactorial(k: number): number {
  if (k <= 0) return 0
  if (k === 1) return 0
  if (k < 20) {
    let sum = 0
    for (let i = 2; i <= k; i++) sum += Math.log(i)
    return sum
  }
  return k * Math.log(k) - k + 0.5 * (LN_2PI + Math.log(k))
}

function bigIntToLog10(n: bigint): number {
  const str = n.toString()
  if (str.length <= 15) {
    return Math.log10(Number(n))
  }
  const head = Number(str.slice(0, 15))
  const tailDigits = str.length - 15
  return Math.log10(head) + tailDigits
}

function estimateFactorialIndex(n: bigint): number {
  if (n < 1n) return 0
  if (n <= 2n) return Number(n)

  const log10N = bigIntToLog10(n)
  const lnN = log10N * Math.LN10

  let lo = 1
  let hi = Math.min(200000, Math.max(10, Math.floor(lnN * 1.5) + 10))

  while (stirlingLogFactorial(hi) < lnN) {
    lo = hi
    hi = Math.floor(hi * 1.5) + 10
    if (hi > 1000000) break
  }

  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2)
    const lnMidFact = stirlingLogFactorial(mid)
    if (lnMidFact < lnN) {
      lo = mid + 1
    } else {
      hi = mid
    }
  }

  const candidate = lo
  for (let k = Math.max(1, candidate - 2); k <= candidate + 2; k++) {
    const lnFactK = stirlingLogFactorial(k)
    const lnFactK1 = stirlingLogFactorial(k + 1)
    if (lnFactK <= lnN && lnN < lnFactK1) {
      return k
    }
  }
  return candidate
}

async function factorialWithProgress(
  k: bigint,
  onProgress?: ProgressCallback
): Promise<bigint> {
  if (k < 0n) throw new Error('阶乘参数必须非负')
  if (k <= 1n) return 1n

  let result = 1n
  const totalSteps = Number(k)
  let lastProgress = 0

  for (let i = 1n; i <= k; i++) {
    result *= i

    const step = Number(i)
    const progress = step / totalSteps
    if (onProgress && progress - lastProgress >= 0.05) {
      lastProgress = progress
      onProgress(progress, `计算阶乘: ${step} / ${totalSteps}`)
      await new Promise(resolve => setImmediate(resolve))
    }
  }

  if (onProgress) {
    onProgress(1, `阶乘计算完成: ${k}! = ${result.toString().length} 位数字`)
  }
  return result
}

async function findFactorialIndex(
  n: bigint,
  onProgress?: ProgressCallback
): Promise<bigint | null> {
  if (n < 1n) return null

  if (onProgress) onProgress(0.05, '使用斯特林公式快速估算...')
  const estimatedK = estimateFactorialIndex(n)
  if (onProgress) onProgress(0.2, `估算结果: k ≈ ${estimatedK}`)

  const searchRange = 5
  const startK = BigInt(Math.max(1, estimatedK - searchRange))
  const endK = BigInt(estimatedK + searchRange)

  let fact = 1n
  let currentK = 1n

  if (startK > 20n) {
    if (onProgress) onProgress(0.4, `计算基准阶乘: ${startK - 1n}! ...`)
    fact = await factorialWithProgress(startK - 1n, (p, msg) => {
      if (onProgress) onProgress(0.4 + p * 0.3, msg)
    })
    currentK = startK - 1n
  }

  if (onProgress) onProgress(0.75, '精确比对中...')
  for (let k = startK; k <= endK; k++) {
    while (currentK < k) {
      currentK++
      fact *= currentK
    }

    if (fact === n) return k
    if (fact > n) {
      if (onProgress) onProgress(1, `验证完成: ${k}! > n，不是阶数位`)
      return null
    }

    await new Promise(resolve => setImmediate(resolve))
  }

  if (onProgress) onProgress(1, '验证完成')
  return null
}

async function getFactorialsUpTo(
  n: bigint,
  onProgress?: ProgressCallback
): Promise<Array<{ k: bigint; value: bigint }>> {
  const result: Array<{ k: bigint; value: bigint }> = []
  if (n < 1n) return result

  if (onProgress) onProgress(0, '使用斯特林公式快速估算阶乘范围...')
  const estimatedK = estimateFactorialIndex(n)
  const maxK = Math.max(estimatedK + 2, 10)
  if (onProgress) onProgress(0.3, `估算需要计算前 ${maxK} 个阶乘`)

  let fact = 1n
  let k = 1n
  const totalK = BigInt(maxK)

  while (k <= totalK) {
    fact *= k

    if (fact > n) break

    result.push({ k, value: fact })

    if (onProgress && Number(k) % Math.max(1, Math.floor(maxK / 20)) === 0) {
      onProgress(0.3 + (Number(k) / maxK) * 0.7, `已计算 ${k}! ...`)
      await new Promise(resolve => setImmediate(resolve))
    }

    k++
  }

  if (onProgress) onProgress(1, `共找到 ${result.length} 个阶乘 ≤ n`)
  return result
}

async function getNearestFactorials(
  n: bigint,
  onProgress?: ProgressCallback
): Promise<Array<{ k: bigint; value: bigint }>> {
  if (onProgress) onProgress(0, '查找附近阶数位...')

  const estimatedK = estimateFactorialIndex(n)
  const startK = BigInt(Math.max(1, estimatedK - 2))
  const endK = BigInt(estimatedK + 3)

  if (onProgress) onProgress(0.3, `在 k=${startK} 到 k=${endK} 范围内精确计算...`)

  const result: Array<{ k: bigint; value: bigint }> = []
  let fact = 1n

  for (let k = 1n; k <= endK; k++) {
    fact *= k
    if (k >= startK) {
      result.push({ k, value: fact })
    }

    if (onProgress && Number(k) % 50 === 0) {
      await new Promise(resolve => setImmediate(resolve))
    }
  }

  if (onProgress) onProgress(1, '附近阶数位查找完成')
  return result
}

export async function checkLiouvilleDigit(
  n: bigint,
  onProgress?: ProgressCallback
): Promise<LiouvilleResult> {
  if (n < 1n) {
    throw new Error('位置必须是正整数')
  }

  if (onProgress) onProgress(0, `开始分析第 ${n.toString()} 位...`)

  const factorialIndex = await findFactorialIndex(n, (p, msg) => {
    if (onProgress) onProgress(p * 0.5, msg)
  })
  const digit: 0 | 1 = factorialIndex !== null ? 1 : 0

  if (onProgress) onProgress(0.55, digit === 1 ? '✨ 发现阶数位！' : '不是阶数位，继续收集周边信息...')

  const factorialsUpToPosition = await getFactorialsUpTo(n, (p, msg) => {
    if (onProgress) onProgress(0.55 + p * 0.3, msg)
  })

  const nearestFactorials = await getNearestFactorials(n, (p, msg) => {
    if (onProgress) onProgress(0.85 + p * 0.15, msg)
  })

  if (onProgress) onProgress(1, '分析完成！')
  await new Promise(resolve => setTimeout(resolve, 100))

  return {
    position: n,
    digit,
    factorialIndex: factorialIndex ?? undefined,
    nearestFactorials,
    factorialsUpToPosition
  }
}

export async function calculateDensity(
  totalBits: bigint,
  numRanges: number = 100,
  onProgress?: ProgressCallback
): Promise<DensityDataPoint[]> {
  if (totalBits < 1n || numRanges < 1) {
    throw new Error('参数必须为正')
  }

  if (onProgress) onProgress(0, `开始密度分析: ${totalBits.toString()} 位 / ${numRanges} 段`)

  const rangeSize = totalBits / BigInt(numRanges)
  if (rangeSize < 1n) {
    throw new Error('范围数量过多，请减少范围数量或增加总位数')
  }

  if (onProgress) onProgress(0.15, '收集范围内所有阶乘...')
  const allFactorials = await getFactorialsUpTo(totalBits, (p, msg) => {
    if (onProgress) onProgress(0.15 + p * 0.5, msg)
  })

  if (onProgress) onProgress(0.7, `找到 ${allFactorials.length} 个阶数位，正在分配到各区间...`)

  const result: DensityDataPoint[] = []
  const factorialValues = allFactorials.map(f => f.value)

  for (let i = 0; i < numRanges; i++) {
    const rangeStart = BigInt(i) * rangeSize + 1n
    const rangeEnd = i === numRanges - 1 ? totalBits : BigInt(i + 1) * rangeSize

    let count = 0
    for (const fact of factorialValues) {
      if (fact >= rangeStart && fact <= rangeEnd) {
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

    if (onProgress && i % Math.max(1, Math.floor(numRanges / 20)) === 0) {
      onProgress(0.7 + (i / numRanges) * 0.3, `已处理 ${i + 1}/${numRanges} 个区间`)
      await new Promise(resolve => setImmediate(resolve))
    }
  }

  if (onProgress) onProgress(1, `密度分析完成！共 ${allFactorials.length} 个 1`)
  return result
}

export async function generateSpiralData(
  totalBits: bigint,
  pointsPerRotation: number = 360,
  onProgress?: ProgressCallback
): Promise<SpiralDataPoint[]> {
  if (totalBits < 1n) {
    throw new Error('位数必须为正')
  }

  if (onProgress) onProgress(0, `生成螺旋数据: ${totalBits.toString()} 位`)

  if (onProgress) onProgress(0.2, '收集阶数位集合...')
  const allFactorials = await getFactorialsUpTo(totalBits, (p, msg) => {
    if (onProgress) onProgress(0.2 + p * 0.3, msg)
  })
  const factorialSet = new Set(allFactorials.map(f => f.value.toString()))

  if (onProgress) onProgress(0.55, `生成螺旋坐标点...`)

  const result: SpiralDataPoint[] = []
  const totalBitsNum = Math.min(Number(totalBits), 10000)

  for (let i = 1; i <= totalBitsNum; i++) {
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

    if (onProgress && i % Math.max(1, Math.floor(totalBitsNum / 20)) === 0) {
      onProgress(0.55 + progress * 0.45, `已生成 ${i}/${totalBitsNum} 个点`)
      await new Promise(resolve => setImmediate(resolve))
    }
  }

  if (onProgress) onProgress(1, '螺旋数据生成完成！')
  return result
}

export async function generateDigitSequence(
  start: bigint,
  length: number,
  onProgress?: ProgressCallback
): Promise<Array<{ position: bigint; digit: 0 | 1 }>> {
  if (start < 1n || length < 1) {
    throw new Error('参数必须为正')
  }

  if (onProgress) onProgress(0, `生成序列: 从第 ${start.toString()} 位开始，共 ${length} 位`)

  const end = start + BigInt(length)
  if (onProgress) onProgress(0.2, '收集范围内阶乘...')
  const allFactorials = await getFactorialsUpTo(end, (p, msg) => {
    if (onProgress) onProgress(0.2 + p * 0.5, msg)
  })
  const factorialSet = new Set(allFactorials.map(f => f.value.toString()))

  if (onProgress) onProgress(0.75, '构建序列...')
  const result: Array<{ position: bigint; digit: 0 | 1 }> = []

  for (let i = 0n; i < BigInt(length); i++) {
    const pos = start + i
    const digit: 0 | 1 = factorialSet.has(pos.toString()) ? 1 : 0
    result.push({ position: pos, digit })

    if (onProgress && Number(i) % Math.max(1, Math.floor(length / 20)) === 0) {
      onProgress(0.75 + (Number(i) / length) * 0.25, `已构建 ${Number(i) + 1}/${length} 位`)
      await new Promise(resolve => setImmediate(resolve))
    }
  }

  if (onProgress) onProgress(1, '序列生成完成！')
  return result
}

const TRANSCENDENTAL_PROBABILITY = 0.99999
const ALGEBRAIC_PROBABILITY = 0.00001

function isAlgebraicCandidate(value: number): boolean {
  const absVal = Math.abs(value)
  if (absVal < 1e-10) return true

  const decimalStr = absVal.toString()
  const dotIndex = decimalStr.indexOf('.')
  if (dotIndex === -1) return true

  const decimalPart = decimalStr.slice(dotIndex + 1)
  if (decimalPart.length < 15) return true

  for (let period = 1; period <= 10; period++) {
    let repeating = true
    for (let i = 0; i < decimalPart.length - period; i++) {
      if (decimalPart[i] !== decimalPart[i + period]) {
        repeating = false
        break
      }
    }
    if (repeating) return true
  }

  for (let degree = 1; degree <= 4; degree++) {
    for (let coeffRange = 1; coeffRange <= 10; coeffRange++) {
      if (isRootOfPolynomial(value, degree, coeffRange)) {
        return true
      }
    }
  }

  return false
}

function isRootOfPolynomial(value: number, degree: number, coeffRange: number): boolean {
  const tolerance = 1e-8
  for (let a = -coeffRange; a <= coeffRange; a++) {
    if (a === 0 && degree === 0) continue
    for (let b = -coeffRange; b <= coeffRange; b++) {
      for (let c = -coeffRange; c <= coeffRange; c++) {
        for (let d = -coeffRange; d <= coeffRange; d++) {
          let poly = 0
          if (degree >= 0) poly += d * Math.pow(value, 0)
          if (degree >= 1) poly += c * Math.pow(value, 1)
          if (degree >= 2) poly += b * Math.pow(value, 2)
          if (degree >= 3) poly += a * Math.pow(value, 3)
          if (Math.abs(poly) < tolerance) {
            return true
          }
        }
      }
    }
  }
  return false
}

function classifyRealNumber(value: number): { type: RealNumberType; confidence: number; explanation: string } {
  const absVal = Math.abs(value)
  const decimalStr = absVal.toFixed(20)

  if (absVal < 1e-10) {
    return {
      type: 'algebraic',
      confidence: 1.0,
      explanation: '0 是整系数方程 x = 0 的根，因此是代数数'
    }
  }

  const isInteger = Math.abs(absVal - Math.round(absVal)) < 1e-10
  if (isInteger) {
    return {
      type: 'algebraic',
      confidence: 1.0,
      explanation: `整数 ${Math.round(absVal)} 是方程 x - ${Math.round(absVal)} = 0 的根，因此是代数数`
    }
  }

  const dotIndex = decimalStr.indexOf('.')
  if (dotIndex !== -1) {
    const decimalPart = decimalStr.slice(dotIndex + 1)
    for (let period = 1; period <= 12; period++) {
      if (decimalPart.length > period * 3) {
        let repeating = true
        const pattern = decimalPart.slice(0, period)
        for (let i = period; i < decimalPart.length - period; i += period) {
          if (decimalPart.slice(i, i + period) !== pattern) {
            repeating = false
            break
          }
        }
        if (repeating) {
          return {
            type: 'algebraic',
            confidence: 0.95,
            explanation: `0.${pattern}... 是循环小数（周期 ${period}），所有循环小数都是有理数，因此是代数数`
          }
        }
      }
    }
  }

  if (isAlgebraicCandidate(value)) {
    return {
      type: 'algebraic',
      confidence: 0.7,
      explanation: '该数可能是某个低次整系数多项式的根，推测为代数数'
    }
  }

  const random = Math.random()
  if (random < ALGEBRAIC_PROBABILITY * 10) {
    return {
      type: 'algebraic',
      confidence: 0.1,
      explanation: '从测度论角度，随机选到代数数的概率为0。但由于计算的有限性，这里模拟极小概率事件。'
    }
  }

  return {
    type: 'transcendental',
    confidence: 0.999,
    explanation: '从测度论角度，在实数轴上随机选取一点，该点为超越数的概率为1。几乎所有实数都是超越数。'
  }
}

export function classifyRealNumberWithLiouville(value: number): RealNumberInfo {
  const classification = classifyRealNumber(value)
  const intValue = BigInt(Math.floor(Math.abs(value)))

  let isLiouville = false
  let liouvilleDigit: 0 | 1 | undefined
  let liouvillePosition: bigint | undefined
  let typeDescription: string
  let explanation = classification.explanation

  if (intValue > 0n) {
    const factorialIndex = findFactorialIndexSync(intValue)
    if (factorialIndex !== null) {
      isLiouville = true
      liouvilleDigit = 1
      liouvillePosition = intValue
      classification.type = 'liouville'
      classification.confidence = 1.0
      explanation = `刘维尔数小数点后第 ${intValue} 位是 1（因为 ${intValue} = ${factorialIndex}!）。刘维尔数是第一个被证明的超越数。`
    }
  }

  if (isLiouville) {
    typeDescription = '刘维尔数（特殊超越数）'
  } else if (classification.type === 'transcendental') {
    typeDescription = '超越数'
    explanation += ' 刘维尔数只是不可数多个超越数中的一个特例。'
  } else {
    typeDescription = '代数数'
  }

  return {
    value,
    type: classification.type,
    typeDescription,
    isLiouville,
    liouvilleDigit,
    liouvillePosition,
    confidence: classification.confidence,
    explanation
  }
}

function findFactorialIndexSync(n: bigint): bigint | null {
  if (n < 1n) return null

  const estK = estimateFactorialIndex(n)
  const searchRange = 5

  for (let offset = -searchRange; offset <= searchRange; offset++) {
    const k = BigInt(Math.max(1, estK + offset))
    const fact = computeFactorialSync(k)
    if (fact === n) return k
    if (fact > n * 1000n) break
  }

  return null
}

function computeFactorialSync(k: bigint): bigint {
  let result = 1n
  for (let i = 2n; i <= k; i++) {
    result *= i
  }
  return result
}

export async function generateOceanParticles(
  count: number,
  bounds: { minX: number; maxX: number; minY: number; maxY: number },
  onProgress?: ProgressCallback
): Promise<OceanParticle[]> {
  const particles: OceanParticle[] = []
  const width = bounds.maxX - bounds.minX
  const height = bounds.maxY - bounds.minY

  if (onProgress) onProgress(0, '开始生成实数海洋粒子...')

  for (let i = 0; i < count; i++) {
    const x = bounds.minX + Math.random() * width
    const y = bounds.minY + Math.random() * height
    const z = (Math.random() - 0.5) * 0.5
    const value = x

    const classification = classifyRealNumber(value)

    let type: RealNumberType = classification.type
    const intValue = BigInt(Math.floor(Math.abs(value)))
    if (intValue > 0n) {
      const factIndex = findFactorialIndexSync(intValue)
      if (factIndex !== null) {
        type = 'liouville'
      }
    }

    particles.push({
      id: i,
      x,
      y,
      z,
      value,
      type
    })

    if (onProgress && i % Math.max(1, Math.floor(count / 50)) === 0) {
      onProgress(i / count, `已生成 ${i + 1}/${count} 个粒子`)
      await new Promise(resolve => setImmediate(resolve))
    }
  }

  if (onProgress) onProgress(1, '实数海洋粒子生成完成！')
  return particles
}

export async function queryOceanPoint(
  query: OceanPointQuery,
  onProgress?: ProgressCallback
): Promise<OceanQueryResult> {
  const { value, range } = query

  if (onProgress) onProgress(0, '正在分析该区域的实数分布...')

  const liouvilleChecks: Array<{ position: bigint; digit: 0 | 1; isFactorial: boolean }> = []

  const startPos = BigInt(Math.max(1, Math.floor(value - range)))
  const endPos = BigInt(Math.max(1, Math.floor(value + range)))
  const totalChecks = Number(endPos - startPos + 1n)

  for (let pos = startPos; pos <= endPos; pos++) {
    const factIndex = findFactorialIndexSync(pos)
    const isFactorial = factIndex !== null
    const digit: 0 | 1 = isFactorial ? 1 : 0
    liouvilleChecks.push({ position: pos, digit, isFactorial })

    if (onProgress && totalChecks > 10) {
      const progress = 0.5 + (Number(pos - startPos) / totalChecks) * 0.5
      if (Number(pos - startPos) % Math.max(1, Math.floor(totalChecks / 20)) === 0) {
        onProgress(progress, `正在检查第 ${pos} 位...`)
        await new Promise(resolve => setImmediate(resolve))
      }
    }
  }

  const liouvilleCount = liouvilleChecks.filter(c => c.isFactorial).length
  const transcendentalDensity = TRANSCENDENTAL_PROBABILITY
  const algebraicDensity = ALGEBRAIC_PROBABILITY

  let dominantType: RealNumberType = 'transcendental'
  if (liouvilleCount > 0) {
    dominantType = 'liouville'
  }

  const explanation =
    liouvilleCount > 0
      ? `该区间内包含 ${liouvilleCount} 个刘维尔数的1数位（阶乘位置）。`
      : '该区间内没有刘维尔数的1数位。从测度论角度，该区域几乎全部是超越数。'

  if (onProgress) onProgress(1, '区域分析完成！')

  return {
    centerValue: value,
    range,
    liouvilleChecks,
    dominantType,
    explanation,
    transcendentalDensity,
    algebraicDensity,
    liouvilleCount
  }
}
