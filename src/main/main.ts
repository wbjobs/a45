import { app, BrowserWindow, ipcMain } from 'electron'
import * as path from 'path'
import {
  checkLiouvilleDigit,
  calculateDensity,
  generateSpiralData,
  generateDigitSequence,
  LiouvilleResult,
  DensityDataPoint,
  SpiralDataPoint
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

ipcMain.handle(
  'check-digit',
  (event, positionStr: string): LiouvilleResult => {
    try {
      const position = BigInt(positionStr)
      const result = checkLiouvilleDigit(position)
      return serializeBigInt(result) as unknown as LiouvilleResult
    } catch (error: any) {
      throw new Error(error.message || '计算失败')
    }
  }
)

ipcMain.handle(
  'calculate-density',
  (event, totalBitsStr: string, numRanges: number): DensityDataPoint[] => {
    try {
      const totalBits = BigInt(totalBitsStr)
      const result = calculateDensity(totalBits, numRanges)
      return serializeBigInt(result) as unknown as DensityDataPoint[]
    } catch (error: any) {
      throw new Error(error.message || '密度计算失败')
    }
  }
)

ipcMain.handle(
  'generate-spiral',
  (event, totalBitsStr: string, pointsPerRotation: number): SpiralDataPoint[] => {
    try {
      const totalBits = BigInt(totalBitsStr)
      const result = generateSpiralData(totalBits, pointsPerRotation)
      return serializeBigInt(result) as unknown as SpiralDataPoint[]
    } catch (error: any) {
      throw new Error(error.message || '螺旋数据生成失败')
    }
  }
)

ipcMain.handle(
  'generate-sequence',
  (event, startStr: string, length: number): Array<{ position: string; digit: 0 | 1 }> => {
    try {
      const start = BigInt(startStr)
      const result = generateDigitSequence(start, length)
      return serializeBigInt(result) as unknown as Array<{ position: string; digit: 0 | 1 }>
    } catch (error: any) {
      throw new Error(error.message || '序列生成失败')
    }
  }
)
