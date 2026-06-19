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
