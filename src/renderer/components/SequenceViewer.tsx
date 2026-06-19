import { useState, useEffect, useMemo } from 'react'
import type { DigitSequencePoint } from '../types/global'

function SequenceViewer() {
  const [start, setStart] = useState('1')
  const [length, setLength] = useState(200)
  const [data, setData] = useState<DigitSequencePoint[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadData = async () => {
    if (!start.trim() || !/^\d+$/.test(start.trim())) {
      setError('请输入有效的起始位置')
      return
    }

    const startNum = BigInt(start.trim())
    if (startNum < 1n) {
      setError('起始位置必须大于 0')
      return
    }

    if (length < 1 || length > 5000) {
      setError('显示长度必须在 1-5000 之间')
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = await window.liouvilleAPI.generateSequence(start.trim(), length)
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

  const groups = useMemo(() => {
    const result: Array<{ start: string; end: string; digits: string; ones: number[] }> = []
    const groupSize = 50

    for (let i = 0; i < data.length; i += groupSize) {
      const group = data.slice(i, i + groupSize)
      const digits = group.map(d => d.digit).join('')
      const ones: number[] = []
      group.forEach((d, idx) => {
        if (d.digit === 1) {
          ones.push(i + idx)
        }
      })
      result.push({
        start: group[0].position,
        end: group[group.length - 1].position,
        digits,
        ones
      })
    }

    return result
  }, [data])

  const oneCount = data.filter(d => d.digit === 1).length
  const zeroCount = data.length - oneCount

  const formatNumber = (numStr: string) => {
    return BigInt(numStr).toLocaleString('zh-CN')
  }

  const renderDigitRow = (group: typeof groups[0]) => {
    const chars = []
    for (let i = 0; i < group.digits.length; i++) {
      const digit = group.digits[i]
      const isOne = digit === '1'
      const globalIndex = parseInt(group.start) + i - 1

      chars.push(
        <span
          key={i}
          style={{
            display: 'inline-block',
            width: '18px',
            height: '22px',
            lineHeight: '22px',
            textAlign: 'center',
            fontFamily: 'Consolas, Monaco, monospace',
            fontSize: '14px',
            fontWeight: isOne ? 'bold' : 'normal',
            color: isOne ? '#81c784' : 'rgba(224, 224, 255, 0.6)',
            background: isOne ? 'rgba(76, 175, 80, 0.2)' : 'transparent',
            borderRadius: isOne ? '3px' : '0',
            margin: '0 1px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            position: 'relative'
          }}
          title={`第 ${formatNumber((BigInt(group.start) + BigInt(i)).toString())} 位: ${digit}`}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.2)'
            e.currentTarget.style.zIndex = '10'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)'
            e.currentTarget.style.zIndex = '1'
          }}
        >
          {digit}
        </span>
      )

      if ((i + 1) % 10 === 0 && i < group.digits.length - 1) {
        chars.push(
          <span
            key={`sep-${i}`}
            style={{
              width: '8px',
              display: 'inline-block'
            }}
          />
        )
      }
    }
    return chars
  }

  const jumpToFactorial = (factorial: string) => {
    const target = BigInt(factorial)
    const offset = BigInt(Math.floor(length / 2))
    const newStart = target > offset ? target - offset : 1n
    setStart(newStart.toString())
    loadData()
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      height: '100%',
      gap: '16px'
    }}>
      <div style={{
        display: 'flex',
        gap: '20px',
        padding: '20px 24px',
        background: 'rgba(0, 0, 0, 0.4)',
        borderRadius: '12px',
        border: '1px solid rgba(100, 150, 255, 0.2)',
        backdropFilter: 'blur(10px)',
        alignItems: 'center',
        flexWrap: 'wrap',
        flexShrink: 0
      }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <h2 style={{
            fontSize: '20px',
            color: '#64b5f6',
            marginBottom: '4px'
          }}>
            🔢 序列查看器
          </h2>
          <p style={{
            fontSize: '12px',
            color: 'rgba(224, 224, 255, 0.6)'
          }}>
            查看刘维尔数的连续小数位序列。阶数位（1）会高亮显示。
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label style={{
              fontSize: '11px',
              color: 'rgba(224, 224, 255, 0.7)',
              marginBottom: '4px',
              display: 'block'
            }}>
              起始位置
            </label>
            <input
              type="text"
              value={start}
              onChange={(e) => setStart(e.target.value.replace(/[^\d]/g, ''))}
              style={{
                width: '120px',
                padding: '8px 12px',
                fontSize: '13px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(100, 150, 255, 0.3)',
                borderRadius: '6px',
                color: '#e0e0ff',
                outline: 'none',
                fontFamily: 'Consolas, Monaco, monospace'
              }}
            />
          </div>

          <div>
            <label style={{
              fontSize: '11px',
              color: 'rgba(224, 224, 255, 0.7)',
              marginBottom: '4px',
              display: 'block'
            }}>
              显示位数: {length}
            </label>
            <input
              type="range"
              min="50"
              max="1000"
              step="50"
              value={length}
              onChange={(e) => setLength(parseInt(e.target.value))}
              style={{
                width: '120px',
                cursor: 'pointer'
              }}
            />
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            style={{
              padding: '8px 18px',
              fontSize: '13px',
              fontWeight: 600,
              background: 'linear-gradient(135deg, #4fc3f7, #ba68c8)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? '加载中...' : '查看'}
          </button>

          <button
            onClick={() => {
              const startNum = BigInt(start)
              const lengthNum = BigInt(length)
              const newStart = startNum > lengthNum ? startNum - lengthNum : 1n
              setStart(newStart.toString())
              loadData()
            }}
            style={{
              padding: '8px 14px',
              fontSize: '13px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(100, 150, 255, 0.3)',
              color: '#e0e0ff',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            ◀ 上一页
          </button>

          <button
            onClick={() => {
              const newStart = BigInt(start) + BigInt(length)
              setStart(newStart.toString())
              loadData()
            }}
            style={{
              padding: '8px 14px',
              fontSize: '13px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(100, 150, 255, 0.3)',
              color: '#e0e0ff',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            下一页 ▶
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '12px',
          background: 'rgba(244, 67, 54, 0.15)',
          border: '1px solid rgba(244, 67, 54, 0.4)',
          borderRadius: '8px',
          color: '#ef9a9a',
          fontSize: '13px',
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
            gap: '12px',
            flexShrink: 0
          }}>
            <div style={{
              padding: '14px',
              background: 'rgba(0, 0, 0, 0.4)',
              borderRadius: '10px',
              border: '1px solid rgba(100, 150, 255, 0.2)'
            }}>
              <div style={{ fontSize: '11px', color: 'rgba(224, 224, 255, 0.5)', marginBottom: '4px' }}>
                起始位置
              </div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#64b5f6', fontFamily: 'Consolas, Monaco, monospace' }}>
                {formatNumber(start)}
              </div>
            </div>

            <div style={{
              padding: '14px',
              background: 'rgba(0, 0, 0, 0.4)',
              borderRadius: '10px',
              border: '1px solid rgba(100, 150, 255, 0.2)'
            }}>
              <div style={{ fontSize: '11px', color: 'rgba(224, 224, 255, 0.5)', marginBottom: '4px' }}>
                结束位置
              </div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#ba68c8', fontFamily: 'Consolas, Monaco, monospace' }}>
                {formatNumber((BigInt(start) + BigInt(data.length) - 1n).toString())}
              </div>
            </div>

            <div style={{
              padding: '14px',
              background: 'rgba(0, 0, 0, 0.4)',
              borderRadius: '10px',
              border: '1px solid rgba(76, 175, 80, 0.2)'
            }}>
              <div style={{ fontSize: '11px', color: 'rgba(224, 224, 255, 0.5)', marginBottom: '4px' }}>
                1 的数量
              </div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#81c784' }}>
                {oneCount}
              </div>
            </div>

            <div style={{
              padding: '14px',
              background: 'rgba(0, 0, 0, 0.4)',
              borderRadius: '10px',
              border: '1px solid rgba(244, 67, 54, 0.2)'
            }}>
              <div style={{ fontSize: '11px', color: 'rgba(224, 224, 255, 0.5)', marginBottom: '4px' }}>
                0 的数量
              </div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#e57373' }}>
                {zeroCount}
              </div>
            </div>
          </div>

          <div style={{
            flex: 1,
            background: 'rgba(0, 0, 0, 0.4)',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid rgba(100, 150, 255, 0.2)',
            backdropFilter: 'blur(10px)',
            overflowY: 'auto',
            minHeight: 0
          }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              {groups.map((group, groupIndex) => (
                <div
                  key={groupIndex}
                  style={{
                    display: 'flex',
                    gap: '16px',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: group.ones.length > 0 ? 'rgba(76, 175, 80, 0.05)' : 'transparent',
                    borderLeft: group.ones.length > 0 ? '3px solid rgba(76, 175, 80, 0.5)' : '3px solid transparent'
                  }}
                >
                  <div style={{
                    width: '160px',
                    flexShrink: 0,
                    fontFamily: 'Consolas, Monaco, monospace',
                    fontSize: '12px',
                    color: 'rgba(224, 224, 255, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <span>{formatNumber(group.start)}</span>
                    <span style={{ opacity: 0.5 }}>-</span>
                    <span>{formatNumber(group.end)}</span>
                  </div>
                  <div style={{
                    flex: 1,
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center'
                  }}>
                    {renderDigitRow(group)}
                  </div>
                  {group.ones.length > 0 && (
                    <div style={{
                      width: '100px',
                      flexShrink: 0,
                      fontSize: '11px',
                      color: '#81c784',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <span>✨ {group.ones.length}个1</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {loading && data.length === 0 && (
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
          正在加载序列...
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      <div style={{
        padding: '16px',
        background: 'rgba(0, 0, 0, 0.4)',
        borderRadius: '12px',
        border: '1px solid rgba(100, 150, 255, 0.2)',
        flexShrink: 0
      }}>
        <div style={{
          fontSize: '13px',
          color: '#ffb74d',
          fontWeight: 600,
          marginBottom: '8px'
        }}>
          ⚡ 快速跳转到阶数位
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { k: 1, v: 1 },
            { k: 2, v: 2 },
            { k: 3, v: 6 },
            { k: 4, v: 24 },
            { k: 5, v: 120 },
            { k: 6, v: 720 },
            { k: 7, v: 5040 },
            { k: 8, v: 40320 },
            { k: 9, v: 362880 },
            { k: 10, v: 3628800 }
          ].map((item) => (
            <button
              key={item.k}
              onClick={() => jumpToFactorial(item.v.toString())}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                background: 'rgba(206, 147, 216, 0.1)',
                border: '1px solid rgba(206, 147, 216, 0.3)',
                borderRadius: '6px',
                color: '#ce93d8',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: 'Consolas, Monaco, monospace'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(206, 147, 216, 0.2)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(206, 147, 216, 0.1)'
              }}
            >
              {item.k}! = {item.v.toLocaleString('zh-CN')}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default SequenceViewer
