import { useState, useEffect, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, Cell, ReferenceLine
} from 'recharts'
import type { DensityDataPoint } from '../types/global'

function DensityChart() {
  const [totalBits, setTotalBits] = useState('10000')
  const [numRanges, setNumRanges] = useState(50)
  const [data, setData] = useState<DensityDataPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadData = async () => {
    if (!totalBits.trim() || !/^\d+$/.test(totalBits.trim())) {
      setError('请输入有效的正整数')
      return
    }

    const bits = BigInt(totalBits.trim())
    if (bits < 100n) {
      setError('总位数必须至少为 100')
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = await window.liouvilleAPI.calculateDensity(totalBits.trim(), numRanges)
      setData(result)
    } catch (err: any) {
      setError(err.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const chartData = useMemo(() => {
    return data.map((d, index) => ({
      name: `${BigInt(d.rangeStart).toLocaleString('zh-CN')}`,
      density: d.density * 1e6,
      count: d.count,
      rangeStart: d.rangeStart,
      rangeEnd: d.rangeEnd,
      index
    }))
  }, [data])

  const totalOnes = useMemo(() => {
    return data.reduce((sum, d) => sum + d.count, 0)
  }, [data])

  const maxDensity = useMemo(() => {
    if (data.length === 0) return 0
    return Math.max(...data.map(d => d.density))
  }, [data])

  const formatNumber = (numStr: string) => {
    return BigInt(numStr).toLocaleString('zh-CN')
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      height: '100%',
      gap: '20px'
    }}>
      <div style={{
        display: 'flex',
        gap: '24px',
        padding: '24px',
        background: 'rgba(0, 0, 0, 0.4)',
        borderRadius: '16px',
        border: '1px solid rgba(100, 150, 255, 0.2)',
        backdropFilter: 'blur(10px)',
        flexShrink: 0
      }}>
        <div style={{ flex: 1 }}>
          <h2 style={{
            fontSize: '22px',
            marginBottom: '8px',
            color: '#64b5f6'
          }}>
            📊 密度分析
          </h2>
          <p style={{
            fontSize: '13px',
            color: 'rgba(224, 224, 255, 0.6)',
            lineHeight: 1.6
          }}>
            分析刘维尔数前 N 位中 1 的密度分布。由于阶乘增长极快，1 的出现会越来越稀疏。
          </p>
        </div>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: '12px',
              color: 'rgba(224, 224, 255, 0.7)',
              marginBottom: '6px'
            }}>
              总位数
            </label>
            <input
              type="text"
              value={totalBits}
              onChange={(e) => setTotalBits(e.target.value.replace(/[^\d]/g, ''))}
              style={{
                width: '140px',
                padding: '10px 14px',
                fontSize: '14px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '2px solid rgba(100, 150, 255, 0.3)',
                borderRadius: '8px',
                color: '#e0e0ff',
                outline: 'none',
                fontFamily: 'Consolas, Monaco, monospace'
              }}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '12px',
              color: 'rgba(224, 224, 255, 0.7)',
              marginBottom: '6px'
            }}>
              分段数: {numRanges}
            </label>
            <input
              type="range"
              min="10"
              max="200"
              value={numRanges}
              onChange={(e) => setNumRanges(parseInt(e.target.value))}
              style={{
                width: '150px',
                height: '6px',
                borderRadius: '3px',
                background: 'rgba(100, 150, 255, 0.3)',
                outline: 'none',
                WebkitAppearance: 'none',
                cursor: 'pointer'
              }}
            />
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            style={{
              padding: '10px 24px',
              fontSize: '14px',
              fontWeight: 600,
              background: loading
                ? 'rgba(100, 150, 255, 0.3)'
                : 'linear-gradient(135deg, #4fc3f7, #ba68c8)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            {loading ? '分析中...' : '重新分析'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '14px',
          background: 'rgba(244, 67, 54, 0.15)',
          border: '1px solid rgba(244, 67, 54, 0.4)',
          borderRadius: '10px',
          color: '#ef9a9a',
          flexShrink: 0
        }}>
          ⚠️ {error}
        </div>
      )}

      {data.length > 0 && (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '16px',
            flexShrink: 0
          }}>
            <div style={{
              padding: '20px',
              background: 'rgba(0, 0, 0, 0.4)',
              borderRadius: '12px',
              border: '1px solid rgba(100, 150, 255, 0.2)'
            }}>
              <div style={{
                fontSize: '12px',
                color: 'rgba(224, 224, 255, 0.5)',
                marginBottom: '6px'
              }}>
                分析位数
              </div>
              <div style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#64b5f6'
              }}>
                {formatNumber(totalBits)}
              </div>
            </div>

            <div style={{
              padding: '20px',
              background: 'rgba(0, 0, 0, 0.4)',
              borderRadius: '12px',
              border: '1px solid rgba(76, 175, 80, 0.2)'
            }}>
              <div style={{
                fontSize: '12px',
                color: 'rgba(224, 224, 255, 0.5)',
                marginBottom: '6px'
              }}>
                1 的总数
              </div>
              <div style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#81c784'
              }}>
                {totalOnes}
              </div>
            </div>

            <div style={{
              padding: '20px',
              background: 'rgba(0, 0, 0, 0.4)',
              borderRadius: '12px',
              border: '1px solid rgba(206, 147, 216, 0.2)'
            }}>
              <div style={{
                fontSize: '12px',
                color: 'rgba(224, 224, 255, 0.5)',
                marginBottom: '6px'
              }}>
                平均密度
              </div>
              <div style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#ce93d8'
              }}>
                {(totalOnes / Number(totalBits) * 1e6).toFixed(2)} ppm
              </div>
            </div>

            <div style={{
              padding: '20px',
              background: 'rgba(0, 0, 0, 0.4)',
              borderRadius: '12px',
              border: '1px solid rgba(255, 152, 0, 0.2)'
            }}>
              <div style={{
                fontSize: '12px',
                color: 'rgba(224, 224, 255, 0.5)',
                marginBottom: '6px'
              }}>
                最大密度
              </div>
              <div style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#ffb74d'
              }}>
                {(maxDensity * 1e6).toFixed(2)} ppm
              </div>
            </div>
          </div>

          <div style={{
            flex: 1,
            display: 'flex',
            gap: '20px',
            minHeight: 0
          }}>
            <div style={{
              flex: 2,
              background: 'rgba(0, 0, 0, 0.4)',
              borderRadius: '16px',
              padding: '24px',
              border: '1px solid rgba(100, 150, 255, 0.2)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0
            }}>
              <h3 style={{
                fontSize: '16px',
                color: '#64b5f6',
                marginBottom: '16px'
              }}>
                📈 1 的密度分布（单位：ppm / 百万分率）
              </h3>
              <div style={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 60 }}>
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4fc3f7" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#ba68c8" stopOpacity={0.9} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis
                      dataKey="name"
                      stroke="rgba(224,224,255,0.5)"
                      tick={{ fill: 'rgba(224,224,255,0.6)', fontSize: 11 }}
                      interval="preserveStartEnd"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis
                      stroke="rgba(224,224,255,0.5)"
                      tick={{ fill: 'rgba(224,224,255,0.6)', fontSize: 11 }}
                      label={{
                        value: '密度 (ppm)',
                        angle: -90,
                        position: 'insideLeft',
                        fill: 'rgba(224,224,255,0.7)',
                        fontSize: 12
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(10, 10, 26, 0.95)',
                        border: '1px solid rgba(100, 150, 255, 0.3)',
                        borderRadius: '8px',
                        color: '#e0e0ff',
                        fontSize: '12px'
                      }}
                      formatter={(value: number) => [`${value.toFixed(4)} ppm`, '密度']}
                      labelFormatter={(label, payload: any) => {
                        if (payload && payload[0]) {
                          const d = payload[0].payload
                          return `区间: ${formatNumber(d.rangeStart)} - ${formatNumber(d.rangeEnd)}`
                        }
                        return label
                      }}
                    />
                    <Bar
                      dataKey="density"
                      fill="url(#barGradient)"
                      radius={[4, 4, 0, 0]}
                    >
                      {chartData.map((entry, index) => (
                        <Cell
                        key={`cell-${index}`}
                        fillOpacity={entry.count > 0 ? 1 : 0.3}
                      />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={{
              flex: 1,
              background: 'rgba(0, 0, 0, 0.4)',
              borderRadius: '16px',
              padding: '24px',
              border: '1px solid rgba(100, 150, 255, 0.2)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0
            }}>
              <h3 style={{
                fontSize: '16px',
                color: '#ce93d8',
                marginBottom: '16px'
              }}>
                📉 累计密度趋势
              </h3>
              <div style={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 30 }}>
                    <defs>
                      <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ce93d8" stopOpacity={0.6} />
                        <stop offset="100%" stopColor="#ce93d8" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis
                      dataKey="index"
                      stroke="rgba(224,224,255,0.5)"
                      tick={{ fill: 'rgba(224,224,255,0.6)', fontSize: 10 }}
                      label={{
                        value: '区间索引',
                        position: 'insideBottom',
                        offset: -10,
                        fill: 'rgba(224,224,255,0.7)',
                        fontSize: 11
                      }}
                    />
                    <YAxis
                      stroke="rgba(224,224,255,0.5)"
                      tick={{ fill: 'rgba(224,224,255,0.6)', fontSize: 11 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(10, 10, 26, 0.95)',
                        border: '1px solid rgba(206, 147, 216, 0.3)',
                        borderRadius: '8px',
                        color: '#e0e0ff',
                        fontSize: '12px'
                      }}
                      formatter={(value: number) => [`${value.toFixed(4)} ppm`, '密度']}
                    />
                    <Area
                      type="monotone"
                      dataKey="density"
                      stroke="#ce93d8"
                      strokeWidth={2}
                      fill="url(#areaGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div style={{
            padding: '20px',
            background: 'rgba(0, 0, 0, 0.4)',
            borderRadius: '12px',
            border: '1px solid rgba(100, 150, 255, 0.2)',
            flexShrink: 0
          }}>
            <div style={{
              fontSize: '14px',
              color: '#64b5f6',
              fontWeight: 600,
              marginBottom: '10px'
            }}>
              💡 关于刘维尔数的密度
            </div>
            <p style={{
              fontSize: '13px',
              color: 'rgba(224, 224, 255, 0.6)',
              lineHeight: 1.6
            }}>
              刘维尔数中 1 的密度随着位数增加而迅速趋近于 0。这是因为阶乘函数增长极快——第 n 个 1 出现在 n! 位，
              而相邻两个 1 之间的间隔会越来越大。前 100 万位中只有 9 个 1（1! 到 9!），
              前 100 亿位中也只有 12 个 1（到 12!）。这种极端的稀疏性是刘维尔数作为超越数的重要特征之一。
            </p>
          </div>
        </>
      )}

      {loading && (
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          color: 'rgba(224, 224, 255, 0.6)'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid rgba(79, 195, 247, 0.3)',
            borderTopColor: '#4fc3f7',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginRight: '16px'
          }} />
          正在分析数据...
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}
    </div>
  )
}

export default DensityChart
