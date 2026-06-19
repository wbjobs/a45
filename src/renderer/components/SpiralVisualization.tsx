import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { SpiralDataPoint, ProgressInfo } from '../types/global'
import ProgressBar from './ProgressBar'

function SpiralVisualization() {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const animationIdRef = useRef<number | null>(null)
  const spiralGroupRef = useRef<THREE.Group | null>(null)
  const particlesRef = useRef<THREE.Points | null>(null)

  const [totalBits, setTotalBits] = useState('5000')
  const [pointsPerRotation, setPointsPerRotation] = useState(720)
  const [data, setData] = useState<SpiralDataPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [autoRotate, setAutoRotate] = useState(true)
  const [showZeros, setShowZeros] = useState(true)
  const [spiralHeight, setSpiralHeight] = useState(true)
  const [progress, setProgress] = useState<ProgressInfo | null>(null)

  useEffect(() => {
    const unsub = window.liouvilleAPI.onGenerateSpiralProgress((info) => {
      setProgress(info)
      if (info.done) {
        setTimeout(() => setProgress(null), 500)
      }
    })
    return unsub
  }, [])

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
    setProgress({ progress: 0, percentage: 0, message: '初始化...' })

    try {
      const result = await window.liouvilleAPI.generateSpiral(totalBits.trim(), pointsPerRotation)
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

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return

    if (sceneRef.current) {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current)
      }
      if (rendererRef.current) {
        rendererRef.current.dispose()
        containerRef.current.removeChild(rendererRef.current.domElement)
      }
    }

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0a0a1a)
    scene.fog = new THREE.FogExp2(0x0a0a1a, 0.008)
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(
      60,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      2000
    )
    camera.position.set(0, 80, 150)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    containerRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.autoRotate = autoRotate
    controls.autoRotateSpeed = 0.5
    controlsRef.current = controls

    const ambientLight = new THREE.AmbientLight(0x404060, 0.6)
    scene.add(ambientLight)

    const pointLight1 = new THREE.PointLight(0x4fc3f7, 2, 300)
    pointLight1.position.set(50, 100, 50)
    scene.add(pointLight1)

    const pointLight2 = new THREE.PointLight(0xba68c8, 1.5, 300)
    pointLight2.position.set(-50, 50, -50)
    scene.add(pointLight2)

    const spiralGroup = new THREE.Group()
    scene.add(spiralGroup)
    spiralGroupRef.current = spiralGroup

    const zeroGeometry = new THREE.BufferGeometry()
    const zeroPositions: number[] = []
    const zeroColors: number[] = []

    const oneGeometry = new THREE.BufferGeometry()
    const onePositions: number[] = []
    const oneColors: number[] = []

    const oneMeshes: THREE.Mesh[] = []

    const maxRadius = Math.max(...data.map(d => d.radius))

    for (let i = 0; i < data.length; i++) {
      const point = data[i]
      const progress = Number(point.position) / Number(totalBits)
      
      const x = point.x
      const z = -point.y
      const y = spiralHeight ? progress * 100 - 50 : 0

      if (point.isOne) {
        onePositions.push(x, y, z)
        
        const color = new THREE.Color()
        color.setHSL(0.3 + progress * 0.2, 1, 0.6)
        oneColors.push(color.r, color.g, color.b)

        const sphereGeometry = new THREE.SphereGeometry(2 + progress * 3, 16, 16)
        const sphereMaterial = new THREE.MeshPhongMaterial({
          color: color,
          emissive: color,
          emissiveIntensity: 0.5,
          shininess: 100
        })
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial)
        sphere.position.set(x, y, z)
        
        const glowGeometry = new THREE.SphereGeometry(4 + progress * 5, 16, 16)
        const glowMaterial = new THREE.MeshBasicMaterial({
          color: color,
          transparent: true,
          opacity: 0.3
        })
        const glow = new THREE.Mesh(glowGeometry, glowMaterial)
        sphere.add(glow)
        
        spiralGroup.add(sphere)
        oneMeshes.push(sphere)

        const lineGeometry = new THREE.BufferGeometry()
        const linePositions = new Float32Array([x, y, z, x, -60, z])
        lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3))
        const lineMaterial = new THREE.LineBasicMaterial({
          color: color,
          transparent: true,
          opacity: 0.2
        })
        const line = new THREE.Line(lineGeometry, lineMaterial)
        spiralGroup.add(line)
      } else if (showZeros) {
        zeroPositions.push(x, y, z)
        
        const color = new THREE.Color()
        color.setHSL(0.6 + Math.sin(progress * Math.PI * 2) * 0.1, 0.5, 0.4)
        zeroColors.push(color.r, color.g, color.b)
      }
    }

    if (showZeros && zeroPositions.length > 0) {
      zeroGeometry.setAttribute('position', new THREE.Float32BufferAttribute(zeroPositions, 3))
      zeroGeometry.setAttribute('color', new THREE.Float32BufferAttribute(zeroColors, 3))

      const zeroMaterial = new THREE.PointsMaterial({
        size: 0.8,
        vertexColors: true,
        transparent: true,
        opacity: 0.6,
        sizeAttenuation: true
      })

      const zeroParticles = new THREE.Points(zeroGeometry, zeroMaterial)
      spiralGroup.add(zeroParticles)
      particlesRef.current = zeroParticles
    }

    oneGeometry.setAttribute('position', new THREE.Float32BufferAttribute(onePositions, 3))
    oneGeometry.setAttribute('color', new THREE.Float32BufferAttribute(oneColors, 3))

    const spiralCurvePoints: THREE.Vector3[] = []
    for (let i = 0; i < data.length; i += 5) {
      const point = data[i]
      const progress = Number(point.position) / Number(totalBits)
      const x = point.x
      const z = -point.y
      const y = spiralHeight ? progress * 100 - 50 : 0
      spiralCurvePoints.push(new THREE.Vector3(x, y, z))
    }
    
    const spiralCurve = new THREE.CatmullRomCurve3(spiralCurvePoints)
    const spiralLineGeometry = new THREE.TubeGeometry(spiralCurve, 500, 0.3, 8, false)
    const spiralLineMaterial = new THREE.MeshPhongMaterial({
      color: 0x64b5f6,
      transparent: true,
      opacity: 0.4,
      emissive: 0x64b5f6,
      emissiveIntensity: 0.2
    })
    const spiralLineMesh = new THREE.Mesh(spiralLineGeometry, spiralLineMaterial)
    spiralGroup.add(spiralLineMesh)

    const gridHelper = new THREE.GridHelper(200, 20, 0x333355, 0x222244)
    gridHelper.position.y = -60
    scene.add(gridHelper)

    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate)

      const time = Date.now() * 0.001

      oneMeshes.forEach((mesh, index) => {
        const pulse = 1 + Math.sin(time * 2 + index * 0.5) * 0.1
        mesh.scale.setScalar(pulse)
      })

      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    const handleResize = () => {
      if (!containerRef.current || !camera || !renderer) return
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current)
      }
      renderer.dispose()
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement)
      }
    }
  }, [data, showZeros, spiralHeight])

  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate
    }
  }, [autoRotate])

  const formatNumber = (numStr: string) => {
    return BigInt(numStr).toLocaleString('zh-CN')
  }

  const oneCount = data.filter(d => d.isOne).length

  return (
    <div style={{
      display: 'flex',
      width: '100%',
      height: '100%',
      gap: '20px'
    }}>
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        minWidth: 0
      }}>
        <div style={{
          padding: '16px 24px',
          background: 'rgba(0, 0, 0, 0.4)',
          borderRadius: '12px',
          border: '1px solid rgba(100, 150, 255, 0.2)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <h2 style={{
              fontSize: '20px',
              color: '#64b5f6',
              marginBottom: '4px'
            }}>
              🌀 螺旋可视化
            </h2>
            <p style={{
              fontSize: '12px',
              color: 'rgba(224, 224, 255, 0.6)'
            }}>
              以前 {formatNumber(totalBits)} 位生成阿基米德螺旋，高亮显示阶数位
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <label style={{
                fontSize: '11px',
                color: 'rgba(224, 224, 255, 0.7)',
                marginBottom: '4px',
                display: 'block'
              }}>
                总位数
              </label>
              <input
                type="text"
                value={totalBits}
                onChange={(e) => setTotalBits(e.target.value.replace(/[^\d]/g, ''))}
                style={{
                  width: '100px',
                  padding: '6px 10px',
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
                每圈点数: {pointsPerRotation}
              </label>
              <input
                type="range"
                min="120"
                max="1440"
                step="60"
                value={pointsPerRotation}
                onChange={(e) => setPointsPerRotation(parseInt(e.target.value))}
                style={{
                  width: '100px',
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
                cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: '18px'
              }}
            >
              {loading ? '生成中...' : '重新生成'}
            </button>
          </div>

          <div style={{ width: '100%', marginTop: '12px' }}>
            <ProgressBar progress={progress} visible={loading || progress !== null} />
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

        <div
          ref={containerRef}
          style={{
            flex: 1,
            background: 'rgba(0, 0, 0, 0.4)',
            borderRadius: '16px',
            border: '1px solid rgba(100, 150, 255, 0.2)',
            backdropFilter: 'blur(10px)',
            overflow: 'hidden',
            minHeight: 0
          }}
        />

        {loading && data.length === 0 && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
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
              margin: '0 auto 16px'
            }} />
            正在生成螺旋...
            <style>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        )}
      </div>

      <div style={{
        width: '280px',
        background: 'rgba(0, 0, 0, 0.4)',
        borderRadius: '16px',
        padding: '20px',
        border: '1px solid rgba(100, 150, 255, 0.2)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        flexShrink: 0,
        overflowY: 'auto'
      }}>
        <div>
          <h3 style={{
            fontSize: '16px',
            color: '#ce93d8',
            marginBottom: '12px'
          }}>
            ⚙️ 显示控制
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              padding: '10px',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '8px',
              border: '1px solid rgba(100, 150, 255, 0.15)'
            }}>
              <input
                type="checkbox"
                checked={autoRotate}
                onChange={(e) => setAutoRotate(e.target.checked)}
                style={{
                  width: '18px',
                  height: '18px',
                  cursor: 'pointer',
                  accentColor: '#4fc3f7'
                }}
              />
              <span style={{ fontSize: '13px', color: 'rgba(224, 224, 255, 0.8)' }}>
                自动旋转
              </span>
            </label>

            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              padding: '10px',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '8px',
              border: '1px solid rgba(100, 150, 255, 0.15)'
            }}>
              <input
                type="checkbox"
                checked={showZeros}
                onChange={(e) => setShowZeros(e.target.checked)}
                style={{
                  width: '18px',
                  height: '18px',
                  cursor: 'pointer',
                  accentColor: '#4fc3f7'
                }}
              />
              <span style={{ fontSize: '13px', color: 'rgba(224, 224, 255, 0.8)' }}>
                显示 0 点
              </span>
            </label>

            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              padding: '10px',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '8px',
              border: '1px solid rgba(100, 150, 255, 0.15)'
            }}>
              <input
                type="checkbox"
                checked={spiralHeight}
                onChange={(e) => setSpiralHeight(e.target.checked)}
                style={{
                  width: '18px',
                  height: '18px',
                  cursor: 'pointer',
                  accentColor: '#4fc3f7'
                }}
              />
              <span style={{ fontSize: '13px', color: 'rgba(224, 224, 255, 0.8)' }}>
                3D 高度模式
              </span>
            </label>
          </div>
        </div>

        <div>
          <h3 style={{
            fontSize: '16px',
            color: '#64b5f6',
            marginBottom: '12px'
          }}>
            📊 统计信息
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{
              padding: '12px',
              background: 'rgba(100, 150, 255, 0.1)',
              borderRadius: '8px',
              border: '1px solid rgba(100, 150, 255, 0.2)'
            }}>
              <div style={{ fontSize: '11px', color: 'rgba(224, 224, 255, 0.5)', marginBottom: '4px' }}>
                总显示点数
              </div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#64b5f6' }}>
                {data.length.toLocaleString('zh-CN')}
              </div>
            </div>

            <div style={{
              padding: '12px',
              background: 'rgba(76, 175, 80, 0.1)',
              borderRadius: '8px',
              border: '1px solid rgba(76, 175, 80, 0.2)'
            }}>
              <div style={{ fontSize: '11px', color: 'rgba(224, 224, 255, 0.5)', marginBottom: '4px' }}>
                1 的数量
              </div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#81c784' }}>
                {oneCount}
              </div>
            </div>

            <div style={{
              padding: '12px',
              background: 'rgba(206, 147, 216, 0.1)',
              borderRadius: '8px',
              border: '1px solid rgba(206, 147, 216, 0.2)'
            }}>
              <div style={{ fontSize: '11px', color: 'rgba(224, 224, 255, 0.5)', marginBottom: '4px' }}>
                0 的数量
              </div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#ce93d8' }}>
                {(data.length - oneCount).toLocaleString('zh-CN')}
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 style={{
            fontSize: '16px',
            color: '#ffb74d',
            marginBottom: '12px'
          }}>
            💡 操作提示
          </h3>
          <ul style={{
            fontSize: '12px',
            color: 'rgba(224, 224, 255, 0.6)',
            lineHeight: 1.8,
            paddingLeft: '16px'
          }}>
            <li>鼠标左键拖拽：旋转视角</li>
            <li>鼠标右键拖拽：平移</li>
            <li>鼠标滚轮：缩放</li>
            <li>发光球体为 1（阶数位）</li>
            <li>微小点为 0（普通位）</li>
          </ul>
        </div>

        <div style={{ marginTop: 'auto' }}>
          <div style={{
            fontSize: '12px',
            color: 'rgba(224, 224, 255, 0.7)',
            marginBottom: '8px'
          }}>
            🎨 图例
          </div>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            padding: '12px',
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, #81c784 0%, #4caf50 50%, transparent 100%)',
                boxShadow: '0 0 10px rgba(76, 175, 80, 0.8)'
              }} />
              <span style={{ fontSize: '12px', color: 'rgba(224, 224, 255, 0.8)' }}>
                数字 1（阶数位）
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#64b5f6',
                opacity: 0.6
              }} />
              <span style={{ fontSize: '12px', color: 'rgba(224, 224, 255, 0.8)' }}>
                数字 0（普通位）
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '16px',
                height: '3px',
                background: 'linear-gradient(90deg, #4fc3f7, #ba68c8)',
                borderRadius: '2px'
              }} />
              <span style={{ fontSize: '12px', color: 'rgba(224, 224, 255, 0.8)' }}>
                螺旋路径
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SpiralVisualization
