import { app, BrowserWindow, ipcMain, IpcMainInvokeEvent } from 'electron'
import * as path from 'path'
import {
  checkLiouvilleDigit,
  calculateDensity,
  generateSpiralData,
  generateDigitSequence,
  classifyRealNumberWithLiouville,
  generateOceanParticles,
  queryOceanPoint,
  LiouvilleResult,
  DensityDataPoint,
  SpiralDataPoint,
  ProgressCallback,
  RealNumberInfo,
  OceanParticle,
  OceanQueryResult,
  OceanPointQuery
} from './liouville'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    backgroundColor: '#0a0a1a',
    webPreferences: {
      preload: path.join(__dirname, '../../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    titleBarStyle: 'hidden',
    frame: true
  })

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

function serializeBigInt(obj: any): any {
  if (typeof obj === 'bigint') {
    return obj.toString()
  }
  if (Array.isArray(obj)) {
    return obj.map(serializeBigInt)
  }
  if (obj !== null && typeof obj === 'object') {
    const result: any = {}
    for (const key in obj) {
      result[key] = serializeBigInt(obj[key])
    }
    return result
  }
  return obj
}

function createProgressCallback(
  event: IpcMainInvokeEvent,
  channel: string
): ProgressCallback {
  let lastSentProgress = -1
  return (progress: number, message: string) => {
    const roundedProgress = Math.round(progress * 100)
    if (roundedProgress !== lastSentProgress) {
      lastSentProgress = roundedProgress
      try {
        event.sender.send(channel, {
          progress: Math.max(0, Math.min(1, progress)),
          percentage: roundedProgress,
          message
        })
      } catch {}
    }
  }
}

ipcMain.handle(
  'check-digit',
  async (event, positionStr: string): Promise<LiouvilleResult> => {
    try {
      const position = BigInt(positionStr)
      const onProgress = createProgressCallback(event, 'check-digit-progress')
      const result = await checkLiouvilleDigit(position, onProgress)
      event.sender.send('check-digit-progress', {
        progress: 1,
        percentage: 100,
        message: '完成！',
        done: true
      })
      return serializeBigInt(result) as unknown as LiouvilleResult
    } catch (error: any) {
      event.sender.send('check-digit-progress', {
        progress: 1,
        percentage: 100,
        message: '出错了',
        error: error.message,
        done: true
      })
      throw new Error(error.message || '计算失败')
    }
  }
)

ipcMain.handle(
  'calculate-density',
  async (event, totalBitsStr: string, numRanges: number): Promise<DensityDataPoint[]> => {
    try {
      const totalBits = BigInt(totalBitsStr)
      const onProgress = createProgressCallback(event, 'calculate-density-progress')
      const result = await calculateDensity(totalBits, numRanges, onProgress)
      event.sender.send('calculate-density-progress', {
        progress: 1,
        percentage: 100,
        message: '完成！',
        done: true
      })
      return serializeBigInt(result) as unknown as DensityDataPoint[]
    } catch (error: any) {
      event.sender.send('calculate-density-progress', {
        progress: 1,
        percentage: 100,
        message: '出错了',
        error: error.message,
        done: true
      })
      throw new Error(error.message || '密度计算失败')
    }
  }
)

ipcMain.handle(
  'generate-spiral',
  async (event, totalBitsStr: string, pointsPerRotation: number): Promise<SpiralDataPoint[]> => {
    try {
      const totalBits = BigInt(totalBitsStr)
      const onProgress = createProgressCallback(event, 'generate-spiral-progress')
      const result = await generateSpiralData(totalBits, pointsPerRotation, onProgress)
      event.sender.send('generate-spiral-progress', {
        progress: 1,
        percentage: 100,
        message: '完成！',
        done: true
      })
      return serializeBigInt(result) as unknown as SpiralDataPoint[]
    } catch (error: any) {
      event.sender.send('generate-spiral-progress', {
        progress: 1,
        percentage: 100,
        message: '出错了',
        error: error.message,
        done: true
      })
      throw new Error(error.message || '螺旋数据生成失败')
    }
  }
)

ipcMain.handle(
  'generate-sequence',
  async (event, startStr: string, length: number): Promise<Array<{ position: string; digit: 0 | 1 }>> => {
    try {
      const start = BigInt(startStr)
      const onProgress = createProgressCallback(event, 'generate-sequence-progress')
      const result = await generateDigitSequence(start, length, onProgress)
      event.sender.send('generate-sequence-progress', {
        progress: 1,
        percentage: 100,
        message: '完成！',
        done: true
      })
      return serializeBigInt(result) as unknown as Array<{ position: string; digit: 0 | 1 }>
    } catch (error: any) {
      event.sender.send('generate-sequence-progress', {
        progress: 1,
        percentage: 100,
        message: '出错了',
        error: error.message,
        done: true
      })
      throw new Error(error.message || '序列生成失败')
    }
  }
)

ipcMain.handle(
  'classify-real-number',
  async (event, value: number): Promise<RealNumberInfo> => {
    try {
      const result = classifyRealNumberWithLiouville(value)
      return serializeBigInt(result) as unknown as RealNumberInfo
    } catch (error: any) {
      throw new Error(error.message || '实数分类失败')
    }
  }
)

ipcMain.handle(
  'generate-ocean-particles',
  async (
    event,
    count: number,
    bounds: { minX: number; maxX: number; minY: number; maxY: number }
  ): Promise<OceanParticle[]> => {
    try {
      const onProgress = createProgressCallback(event, 'generate-ocean-progress')
      const result = await generateOceanParticles(count, bounds, onProgress)
      event.sender.send('generate-ocean-progress', {
        progress: 1,
        percentage: 100,
        message: '完成！',
        done: true
      })
      return serializeBigInt(result) as unknown as OceanParticle[]
    } catch (error: any) {
      event.sender.send('generate-ocean-progress', {
        progress: 1,
        percentage: 100,
        message: '出错了',
        error: error.message,
        done: true
      })
      throw new Error(error.message || '粒子生成失败')
    }
  }
)

ipcMain.handle(
  'query-ocean-point',
  async (event, query: OceanPointQuery): Promise<OceanQueryResult> => {
    try {
      const onProgress = createProgressCallback(event, 'query-ocean-progress')
      const result = await queryOceanPoint(query, onProgress)
      event.sender.send('query-ocean-progress', {
        progress: 1,
        percentage: 100,
        message: '完成！',
        done: true
      })
      return serializeBigInt(result) as unknown as OceanQueryResult
    } catch (error: any) {
      event.sender.send('query-ocean-progress', {
        progress: 1,
        percentage: 100,
        message: '出错了',
        error: error.message,
        done: true
      })
      throw new Error(error.message || '区域查询失败')
    }
  }
)
