import { useState } from 'react'
import DigitChecker from './components/DigitChecker'
import DensityChart from './components/DensityChart'
import SpiralVisualization from './components/SpiralVisualization'
import SequenceViewer from './components/SequenceViewer'
import RealNumberOcean from './components/RealNumberOcean'

function App() {
  const [activeTab, setActiveTab] = useState<'check' | 'density' | 'spiral' | 'sequence' | 'ocean'>('ocean')

  const tabs = [
    { id: 'check', label: '位数查询', icon: '🔍' },
    { id: 'density', label: '密度分析', icon: '📊' },
    { id: 'spiral', label: '螺旋可视化', icon: '🌀' },
    { id: 'sequence', label: '序列查看', icon: '🔢' },
    { id: 'ocean', label: '实数海洋', icon: '🌊' }
  ] as const

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      background: 'linear-gradient(135deg, rgba(10,10,26,0.9) 0%, rgba(26,26,58,0.9) 50%, rgba(10,10,42,0.9) 100%)'
    }}>
      <header style={{
        padding: '20px 30px',
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(100, 150, 255, 0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <div>
          <h1 style={{
            fontSize: '28px',
            fontWeight: 700,
            background: 'linear-gradient(90deg, #64b5f6, #ce93d8, #64b5f6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            margin: 0
          }}>
            刘维尔数可视化
          </h1>
          <p style={{
            fontSize: '13px',
            color: 'rgba(224, 224, 255, 0.6)',
            marginTop: '4px'
          }}>
            Liouville Number Visualizer | 超越数的无规律之美
          </p>
        </div>
        <div style={{
          display: 'flex',
          gap: '8px',
          padding: '4px',
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '12px',
          border: '1px solid rgba(100, 150, 255, 0.2)'
        }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 18px',
                fontSize: '14px',
                fontWeight: 500,
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                background: activeTab === tab.id
                  ? 'linear-gradient(135deg, #4fc3f7, #ba68c8)'
                  : 'transparent',
                color: activeTab === tab.id ? '#fff' : 'rgba(224, 224, 255, 0.7)',
                boxShadow: activeTab === tab.id
                  ? '0 4px 20px rgba(79, 195, 247, 0.4)'
                  : 'none'
              }}
            >
              <span style={{ marginRight: '6px' }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <main style={{
        flex: 1,
        overflow: 'hidden',
        padding: '24px',
        display: 'flex'
      }}>
        {activeTab === 'check' && <DigitChecker />}
        {activeTab === 'density' && <DensityChart />}
        {activeTab === 'spiral' && <SpiralVisualization />}
        {activeTab === 'sequence' && <SequenceViewer />}
        {activeTab === 'ocean' && <RealNumberOcean />}
      </main>

      <footer style={{
        padding: '12px 30px',
        background: 'rgba(0, 0, 0, 0.4)',
        borderTop: '1px solid rgba(100, 150, 255, 0.2)',
        textAlign: 'center',
        fontSize: '12px',
        color: 'rgba(224, 224, 255, 0.5)',
        flexShrink: 0
      }}>
        刘维尔数：0.110001000000000000000001... | 小数点后第 n! 位为 1，其余为 0
      </footer>
    </div>
  )
}

export default App
