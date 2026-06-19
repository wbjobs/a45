import { useState, useEffect } from 'react'
import type { LiouvilleResult, ProgressInfo } from '../types/global'
import ProgressBar from './ProgressBar'

function DigitChecker() {
  const [input, setInput] = useState('')
  const [result, setResult] = useState<LiouvilleResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState<ProgressInfo | null>(null)

  useEffect(() => {
    const unsub = window.liouvilleAPI.onCheckDigitProgress((info) => {
      setProgress(info)
      if (info.done) {
        setTimeout(() => setProgress(null), 500)
      }
    })
    return unsub
  }, [])

  const handleCheck = async () => {
    if (!input.trim()) {
      setError('请输入一个正整数')
      return
    }

    const numStr = input.trim()
    if (!/^\d+$/.test(numStr)) {
      setError('请输入有效的正整数（只能包含数字）')
      return
    }

    if (BigInt(numStr) < 1n) {
      setError('请输入大于 0 的正整数')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)
    setProgress({ progress: 0, percentage: 0, message: '初始化...' })

    try {
      const res = await window.liouvilleAPI.checkDigit(numStr)
      setResult(res)
    } catch (err: any) {
      setError(err.message || '查询失败')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCheck()
    }
  }

  const formatNumber = (numStr: string) => {
    return BigInt(numStr).toLocaleString('zh-CN')
  }

  return (
    <div style={{
      display: 'flex',
      gap: '24px',
      width: '100%',
      height: '100%'
    }}>
      <div style={{
        flex: 1,
        background: 'rgba(0, 0, 0, 0.4)',
        borderRadius: '16px',
        padding: '32px',
        border: '1px solid rgba(100, 150, 255, 0.2)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        overflowY: 'auto'
      }}>
        <div>
          <h2 style={{
            fontSize: '22px',
            marginBottom: '8px',
            color: '#64b5f6'
          }}>
            🔍 查询刘维尔数小数点后第 n 位
          </h2>
          <p style={{
            fontSize: '14px',
            color: 'rgba(224, 224, 255, 0.6)',
            lineHeight: 1.6
          }}>
            刘维尔数是一个著名的超越数，其小数展开中 1 只出现在阶乘位置。
            输入任意正整数 n，查看第 n 位是 0 还是 1。
          </p>
        </div>

        <div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                color: 'rgba(224, 224, 255, 0.7)',
                marginBottom: '8px'
              }}>
                输入位置 n（正整数）
              </label>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value.replace(/[^\d]/g, ''))}
                onKeyPress={handleKeyPress}
                placeholder="例如：1, 2, 6, 24, 120, 720, 1000000000..."
                style={{
                  width: '100%',
                  padding: '14px 18px',
                  fontSize: '18px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '2px solid rgba(100, 150, 255, 0.3)',
                  borderRadius: '10px',
                  color: '#e0e0ff',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  fontFamily: 'Consolas, Monaco, monospace'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'rgba(79, 195, 247, 0.8)'
                  e.target.style.boxShadow = '0 0 20px rgba(79, 195, 247, 0.2)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(100, 150, 255, 0.3)'
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>
            <button
              onClick={handleCheck}
              disabled={loading}
              style={{
                marginTop: '26px',
                padding: '14px 32px',
                fontSize: '16px',
                fontWeight: 600,
                background: loading
                  ? 'rgba(100, 150, 255, 0.3)'
                  : 'linear-gradient(135deg, #4fc3f7, #ba68c8)',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: loading
                  ? 'none'
                  : '0 4px 20px rgba(79, 195, 247, 0.4)'
              }}
            >
              {loading ? '计算中...' : '查询'}
            </button>
          </div>

          <ProgressBar progress={progress} visible={loading || progress !== null} />
        </div>

        {error && (
          <div style={{
            padding: '16px',
            background: 'rgba(244, 67, 54, 0.15)',
            border: '1px solid rgba(244, 67, 54, 0.4)',
            borderRadius: '10px',
            color: '#ef9a9a'
          }}>
            ⚠️ {error}
          </div>
        )}

        {result && (
          <div style={{
            padding: '24px',
            background: result.digit === 1
              ? 'linear-gradient(135deg, rgba(76, 175, 80, 0.15), rgba(76, 175, 80, 0.05))'
              : 'linear-gradient(135deg, rgba(244, 67, 54, 0.15), rgba(244, 67, 54, 0.05))',
            border: `2px solid ${result.digit === 1 ? 'rgba(76, 175, 80, 0.4)' : 'rgba(244, 67, 54, 0.4)'}`,
            borderRadius: '12px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
              marginBottom: '20px'
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: result.digit === 1
                  ? 'linear-gradient(135deg, #4caf50, #8bc34a)'
                  : 'linear-gradient(135deg, #f44336, #ff5722)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '40px',
                fontWeight: 'bold',
                color: '#fff',
                boxShadow: result.digit === 1
                  ? '0 8px 32px rgba(76, 175, 80, 0.5)'
                  : '0 8px 32px rgba(244, 67, 54, 0.5)'
              }}>
                {result.digit}
              </div>
              <div>
                <div style={{
                  fontSize: '16px',
                  color: 'rgba(224, 224, 255, 0.7)',
                  marginBottom: '4px'
                }}>
                  小数点后第 <span style={{ color: '#64b5f6', fontWeight: 600 }}>{formatNumber(result.position)}</span> 位
                </div>
                <div style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: result.digit === 1 ? '#81c784' : '#e57373'
                }}>
                  {result.digit === 1 ? '🎉 这一位是 1！' : '这一位是 0'}
                </div>
              </div>
            </div>

            {result.factorialIndex && (
              <div style={{
                padding: '14px',
                background: 'rgba(76, 175, 80, 0.1)',
                borderRadius: '8px',
                marginBottom: '16px'
              }}>
                <span style={{ color: '#81c784', fontWeight: 600 }}>✨ 阶数位！</span>
                {' '}第 {formatNumber(result.position)} 位 = {result.factorialIndex}!（{result.factorialIndex} 的阶乘）
              </div>
            )}

            {result.factorialsUpToPosition.length > 0 && (
              <div>
                <div style={{
                  fontSize: '14px',
                  color: 'rgba(224, 224, 255, 0.7)',
                  marginBottom: '10px'
                }}>
                  前 {formatNumber(result.position)} 位中共有 <span style={{ color: '#ce93d8', fontWeight: 600 }}>{result.factorialsUpToPosition.length}</span> 个 1：
                </div>
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}>
                  {result.factorialsUpToPosition.map((f, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '6px 12px',
                        background: 'rgba(206, 147, 216, 0.15)',
                        border: '1px solid rgba(206, 147, 216, 0.3)',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontFamily: 'Consolas, Monaco, monospace'
                      }}
                    >
                      {f.k}! = {formatNumber(f.value)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.nearestFactorials.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <div style={{
                  fontSize: '14px',
                  color: 'rgba(224, 224, 255, 0.7)',
                  marginBottom: '10px'
                }}>
                  附近的阶数位：
                </div>
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  flexWrap: 'wrap'
                }}>
                  {result.nearestFactorials.map((f, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '8px 14px',
                        background: f.value === result.position
                          ? 'linear-gradient(135deg, rgba(76, 175, 80, 0.3), rgba(76, 175, 80, 0.1))'
                          : 'rgba(100, 150, 255, 0.1)',
                        border: `2px solid ${f.value === result.position ? 'rgba(76, 175, 80, 0.6)' : 'rgba(100, 150, 255, 0.3)'}`,
                        borderRadius: '8px',
                        fontSize: '13px'
                      }}
                    >
                      <span style={{ color: '#64b5f6' }}>{f.k}!</span> = {formatNumber(f.value)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div style={{
          marginTop: 'auto',
          padding: '20px',
          background: 'rgba(100, 150, 255, 0.05)',
          border: '1px solid rgba(100, 150, 255, 0.15)',
          borderRadius: '10px'
        }}>
          <div style={{
            fontSize: '14px',
            color: '#64b5f6',
            fontWeight: 600,
            marginBottom: '8px'
          }}>
            📚 什么是刘维尔数？
          </div>
          <p style={{
            fontSize: '13px',
            color: 'rgba(224, 224, 255, 0.6)',
            lineHeight: 1.6
          }}>
            刘维尔数是第一个被证明的超越数，由法国数学家刘维尔在 1844 年发现。
            它定义为 L = Σ 10<sup>-n!</sup>，即小数点后第 1!, 2!, 3!, ... 位为 1，其余为 0。
            这个数可以被有理数任意精度地逼近，因此它是一个典型的"可逼近数"。
          </p>
        </div>
      </div>

      <div style={{
        width: '320px',
        background: 'rgba(0, 0, 0, 0.4)',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid rgba(100, 150, 255, 0.2)',
        backdropFilter: 'blur(10px)',
        overflowY: 'auto'
      }}>
        <h3 style={{
          fontSize: '18px',
          color: '#ce93d8',
          marginBottom: '16px'
        }}>
          ⚡ 快速查询
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[
            { n: '1', desc: '1! = 1' },
            { n: '2', desc: '2! = 2' },
            { n: '6', desc: '3! = 6' },
            { n: '24', desc: '4! = 24' },
            { n: '120', desc: '5! = 120' },
            { n: '720', desc: '6! = 720' },
            { n: '5040', desc: '7! = 5040' },
            { n: '40320', desc: '8! = 40320' },
            { n: '362880', desc: '9! = 362880' },
            { n: '3628800', desc: '10! = 3628800' },
            { n: '1000000000', desc: '10亿位 (测试)' },
            { n: '1000000000000', desc: '1万亿位 (测试)' }
          ].map((item) => (
            <button
              key={item.n}
              onClick={() => {
                setInput(item.n)
                setResult(null)
                setError('')
              }}
              style={{
                padding: '12px 16px',
                background: input === item.n
                  ? 'linear-gradient(135deg, rgba(79, 195, 247, 0.3), rgba(186, 104, 200, 0.3))'
                  : 'rgba(255, 255, 255, 0.03)',
                border: input === item.n
                  ? '2px solid rgba(79, 195, 247, 0.6)'
                  : '1px solid rgba(100, 150, 255, 0.15)',
                borderRadius: '8px',
                color: '#e0e0ff',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '14px',
                fontFamily: 'Consolas, Monaco, monospace'
              }}
            >
              <span>第 {item.n.length > 7 ? item.n.slice(0, 3) + '...' + item.n.slice(-3) : item.n} 位</span>
              <span style={{ color: 'rgba(224, 224, 255, 0.5)', fontSize: '12px' }}>
                {item.desc}
              </span>
            </button>
          ))}
        </div>

        <div style={{
          marginTop: '24px',
          padding: '16px',
          background: 'rgba(76, 175, 80, 0.1)',
          border: '1px solid rgba(76, 175, 80, 0.3)',
          borderRadius: '10px'
        }}>
          <div style={{
            fontSize: '13px',
            color: '#81c784',
            fontWeight: 600,
            marginBottom: '6px'
          }}>
            💡 小提示
          </div>
          <p style={{
            fontSize: '12px',
            color: 'rgba(224, 224, 255, 0.6)',
            lineHeight: 1.5
          }}>
            刘维尔数中 1 的位置极为稀疏。前 100 万位中只有 9 个 1（对应 1! 到 9!）。
            尝试输入一个非常大的数（如 10 亿、1 万亿），看看它是不是阶数位！
            现在使用斯特林公式快速估算，不会再卡死。
          </p>
        </div>
      </div>
    </div>
  )
}

export default DigitChecker
