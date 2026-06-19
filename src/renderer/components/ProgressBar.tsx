import { useEffect, useState } from 'react'
import type { ProgressInfo } from '../types/global'

interface ProgressBarProps {
  progress: ProgressInfo | null
  visible: boolean
  height?: number
}

function ProgressBar({ progress, visible, height = 8 }: ProgressBarProps) {
  const [displayProgress, setDisplayProgress] = useState(0)

  useEffect(() => {
    if (progress) {
      setDisplayProgress(progress.percentage)
    }
  }, [progress])

  if (!visible) return null

  const percentage = displayProgress
  const message = progress?.message || '处理中...'

  return (
    <div style={{
      width: '100%',
      margin: '12px 0'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '6px',
        fontSize: '13px'
      }}>
        <span style={{
          color: 'rgba(224, 224, 255, 0.8)'
        }}>
          {message}
        </span>
        <span style={{
          color: '#64b5f6',
          fontWeight: 600,
          fontFamily: 'Consolas, Monaco, monospace'
        }}>
          {percentage}%
        </span>
      </div>
      <div style={{
        width: '100%',
        height: `${height}px`,
        background: 'rgba(255, 255, 255, 0.08)',
        borderRadius: `${height / 2}px`,
        overflow: 'hidden',
        position: 'relative'
      }}>
        <div
          style={{
            height: '100%',
            width: `${percentage}%`,
            background: 'linear-gradient(90deg, #4fc3f7 0%, #ba68c8 50%, #4fc3f7 100%)',
            backgroundSize: '200% 100%',
            borderRadius: `${height / 2}px`,
            transition: 'width 0.3s ease-out',
            boxShadow: '0 0 10px rgba(79, 195, 247, 0.5)',
            animation: percentage < 100 ? 'shimmer 1.5s linear infinite' : 'none'
          }}
        />
      </div>
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  )
}

export default ProgressBar
