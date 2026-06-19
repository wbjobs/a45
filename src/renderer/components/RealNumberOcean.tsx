import { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { OceanParticle, ProgressInfo, OceanQueryResult, RealNumberInfo } from '../types/global'
import ProgressBar from './ProgressBar'

const TYPE_COLORS: Record<string, number> = {
  algebraic: 0xff6b6b,
  transcendental: 0x4fc3f7,
  liouville: 0xffd700
}

const TYPE_NAMES: Record<string, string> = {
  algebraic: '代数数',
  transcendental: '超越数',
  liouville: '刘维尔数'
}

function RealNumberOcean() {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const animationIdRef = useRef<number | null>(null)
  const oceanGroupRef = useRef<THREE.Group | null>(null)
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster())
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2())
  const particlesRef = useRef<THREE.Points | null>(null)
  const highlightRingRef = useRef<THREE.Mesh | null>(null)

  const [particleCount, setParticleCount] = useState(8000)
  const [viewRange, setViewRange] = useState({ min: 1, max: 500 })
  const [particles, setParticles] = useState<OceanParticle[]>([])
  const [loading, setLoading] = useState(false)
  const [queryLoading, setQueryLoading] = useState(false)
  const [error, setError] = useState('')
  const [autoRotate, setAutoRotate] = useState(true)
  const [showAlgebraic, setShowAlgebraic] = useState(true)
  const [showTranscendental, setShowTranscendental] = useState(true)
  const [showLiouville, setShowLiouville] = useState(true)
  const [particleSize, setParticleSize] = useState(1.2)
  const [progress, setProgress] = useState<ProgressInfo | null>(null)
  const [queryProgress, setQueryProgress] = useState<ProgressInfo | null>(null)
  const [selectedInfo, setSelectedInfo] = useState<RealNumberInfo | null>(null)
  const [queryResult, setQueryResult] = useState<OceanQueryResult | null>(null)
  const [hoveredValue, setHoveredValue] = useState<number | null>(null)

  useEffect(() => {
    const unsub1 = window.liouvilleAPI.onGenerateOceanProgress((info) => {
      setProgress(info)
      if (info.done) {
        setTimeout(() => setProgress(null), 500)
      }
    })
    const unsub2 = window.liouvilleAPI.onQueryOceanProgress((info) => {
      setQueryProgress(info)
      if (info.done) {
        setTimeout(() => setQueryProgress(null), 500)
      }
    })
    return () => {
      unsub1()
      unsub2()
    }
  }, [])

  const loadParticles = async () => {
    setLoading(true)
    setError('')
    setProgress({ progress: 0, percentage: 0, message: '初始化实数海洋...' })

    try {
      const bounds = {
        minX: viewRange.min,
        maxX: viewRange.max,
        minY: -50,
        maxY: 50
      }
      const result = await window.liouvilleAPI.generateOceanParticles(particleCount, bounds)
      setParticles(result)
    } catch (err: any) {
      setError(err.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }

  const queryPoint = useCallback(async (value: number, range: number = 5) => {
    if (queryLoading) return

    setQueryLoading(true)
    try {
      const [info, query] = await Promise.all([
        window.liouvilleAPI.classifyRealNumber(value),
        window.liouvilleAPI.queryOceanPoint({ value, range })
      ])
      setSelectedInfo(info)
      setQueryResult(query)
    } catch (err: any) {
      setError(err.message || '查询失败')
    } finally {
      setQueryLoading(false)
    }
  }, [queryLoading])

  useEffect(() => {
    loadParticles()
  }, [])

  useEffect(() => {
    if (!containerRef.current || particles.length === 0) return

    if (sceneRef.current) {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current)
      }
      if (rendererRef.current) {
        rendererRef.current.dispose()
        if (containerRef.current.contains(rendererRef.current.domElement)) {
          containerRef.current.removeChild(rendererRef.current.domElement)
        }
      }
    }

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0a0a1a)
    scene.fog = new THREE.FogExp2(0x0a0a1a, 0.006)
    sceneRef.current = scene

    const width = containerRef.current.clientWidth
    const height = containerRef.current.clientHeight
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 2000)
    camera.position.set((viewRange.min + viewRange.max) / 2, 40, 80)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    containerRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.autoRotate = autoRotate
    controls.autoRotateSpeed = 0.3
    controlsRef.current = controls

    const ambientLight = new THREE.AmbientLight(0x404060, 0.8)
    scene.add(ambientLight)

    const pointLight1 = new THREE.PointLight(0x4fc3f7, 1.5, 300)
    pointLight1.position.set(50, 80, 50)
    scene.add(pointLight1)

    const pointLight2 = new THREE.PointLight(0xff6b6b, 1, 300)
    pointLight2.position.set(-50, 60, -50)
    scene.add(pointLight2)

    const pointLight3 = new THREE.PointLight(0xffd700, 2, 200)
    pointLight3.position.set(0, 100, 0)
    scene.add(pointLight3)

    const oceanGroup = new THREE.Group()
    scene.add(oceanGroup)
    oceanGroupRef.current = oceanGroup

    const allPositions: number[] = []
    const allColors: number[] = []
    const allSizes: number[] = []
    const liouvilleMeshes: THREE.Mesh[] = []

    const xRange = viewRange.max - viewRange.min

    for (const particle of particles) {
      const showType =
        (particle.type === 'algebraic' && showAlgebraic) ||
        (particle.type === 'transcendental' && showTranscendental) ||
        (particle.type === 'liouville' && showLiouville)

      if (!showType) continue

      const normalizedX = (particle.x - viewRange.min) / xRange * 100 - 50
      const x = normalizedX
      const y = particle.y * 0.8
      const z = particle.z * 20

      if (particle.type === 'liouville') {
        const goldColor = new THREE.Color(TYPE_COLORS.liouville)
        const sphereGeometry = new THREE.SphereGeometry(2.5, 16, 16)
        const sphereMaterial = new THREE.MeshPhongMaterial({
          color: goldColor,
          emissive: goldColor,
          emissiveIntensity: 0.6,
          shininess: 100,
          transparent: true,
          opacity: 0.9
        })
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial)
        sphere.position.set(x, y, z)
        sphere.userData = { value: particle.value, type: particle.type }

        const glowGeometry = new THREE.SphereGeometry(4, 16, 16)
        const glowMaterial = new THREE.MeshBasicMaterial({
          color: goldColor,
          transparent: true,
          opacity: 0.3
        })
        const glow = new THREE.Mesh(glowGeometry, glowMaterial)
        sphere.add(glow)

        oceanGroup.add(sphere)
        liouvilleMeshes.push(sphere)
      } else {
        allPositions.push(x, y, z)

        const color = new THREE.Color(TYPE_COLORS[particle.type])
        allColors.push(color.r, color.g, color.b)
        allSizes.push(particle.type === 'algebraic' ? particleSize * 1.5 : particleSize)
      }
    }

    if (allPositions.length > 0) {
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(allPositions, 3))
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(allColors, 3))
      geometry.setAttribute('size', new THREE.Float32BufferAttribute(allSizes, 1))

      const material = new THREE.PointsMaterial({
        size: particleSize,
        vertexColors: true,
        transparent: true,
        opacity: 0.7,
        sizeAttenuation: true
      })

      const points = new THREE.Points(geometry, material)
      oceanGroup.add(points)
      particlesRef.current = points
    }

    const axisMaterial = new THREE.LineBasicMaterial({ color: 0x6666aa, transparent: true, opacity: 0.6 })
    const axisPoints = [
      new THREE.Vector3(-55, 0, 0),
      new THREE.Vector3(55, 0, 0)
    ]
    const axisGeometry = new THREE.BufferGeometry().setFromPoints(axisPoints)
    const axisLine = new THREE.Line(axisGeometry, axisMaterial)
    oceanGroup.add(axisLine)

    for (let i = 0; i <= 10; i++) {
      const x = -50 + i * 10
      const tickPoints = [
        new THREE.Vector3(x, -2, 0),
        new THREE.Vector3(x, 2, 0)
      ]
      const tickGeometry = new THREE.BufferGeometry().setFromPoints(tickPoints)
      const tickLine = new THREE.Line(tickGeometry, axisMaterial)
      oceanGroup.add(tickLine)
    }

    const gridHelper = new THREE.GridHelper(120, 24, 0x222255, 0x111133)
    gridHelper.position.y = -10
    oceanGroup.add(gridHelper)

    const ringGeometry = new THREE.RingGeometry(3, 5, 32)
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    })
    const highlightRing = new THREE.Mesh(ringGeometry, ringMaterial)
    highlightRing.rotation.x = -Math.PI / 2
    highlightRing.visible = false
    oceanGroup.add(highlightRing)
    highlightRingRef.current = highlightRing

    const handleMouseMove = (event: MouseEvent) => {
      if (!containerRef.current || !camera) return

      const rect = containerRef.current.getBoundingClientRect()
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      raycasterRef.current.setFromCamera(mouseRef.current, camera)

      if (liouvilleMeshes.length > 0) {
        const intersects = raycasterRef.current.intersectObjects(liouvilleMeshes)
        if (intersects.length > 0) {
          const obj = intersects[0].object as THREE.Mesh
          setHoveredValue(obj.userData.value)
          if (highlightRingRef.current) {
            highlightRingRef.current.position.copy(obj.position)
            highlightRingRef.current.position.y = -9
            highlightRingRef.current.visible = true
          }
        } else {
          setHoveredValue(null)
          if (highlightRingRef.current) {
            highlightRingRef.current.visible = false
          }
        }
      }
    }

    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current || !camera) return

      const rect = containerRef.current.getBoundingClientRect()
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      raycasterRef.current.setFromCamera(mouseRef.current, camera)

      if (liouvilleMeshes.length > 0) {
        const intersects = raycasterRef.current.intersectObjects(liouvilleMeshes)
        if (intersects.length > 0) {
          const obj = intersects[0].object as THREE.Mesh
          queryPoint(Math.floor(obj.userData.value), 3)
          return
        }
      }

      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
      const intersection = new THREE.Vector3()
      raycasterRef.current.ray.intersectPlane(plane, intersection)
      if (intersection) {
        const worldX = (intersection.x + 50) / 100 * xRange + viewRange.min
        queryPoint(Math.floor(Math.max(1, worldX)), 3)
      }
    }

    renderer.domElement.addEventListener('mousemove', handleMouseMove)
    renderer.domElement.addEventListener('click', handleClick)

    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate)

      const time = Date.now() * 0.001

      liouvilleMeshes.forEach((mesh, index) => {
        const pulse = 1 + Math.sin(time * 2 + index * 0.3) * 0.15
        mesh.scale.setScalar(pulse)
        mesh.position.y += Math.sin(time + index * 0.2) * 0.02
      })

      if (highlightRingRef.current && highlightRingRef.current.visible) {
        const scale = 1 + Math.sin(time * 4) * 0.2
        highlightRingRef.current.scale.setScalar(scale)
      }

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
      renderer.domElement.removeEventListener('mousemove', handleMouseMove)
      renderer.domElement.removeEventListener('click', handleClick)
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current)
      }
      renderer.dispose()
      if (containerRef.current && renderer.domElement) {
        if (containerRef.current.contains(renderer.domElement)) {
          containerRef.current.removeChild(renderer.domElement)
        }
      }
    }
  }, [particles, showAlgebraic, showTranscendental, showLiouville, particleSize, viewRange, queryPoint])

  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate
    }
  }, [autoRotate])

  const algebraicCount = particles.filter(p => p.type === 'algebraic').length
  const transcendentalCount = particles.filter(p => p.type === 'transcendental').length
  const liouvilleCount = particles.filter(p => p.type === 'liouville').length

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
          flexShrink: 0
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div>
              <h2 style={{
                fontSize: '20px',
                color: '#ffd700',
                marginBottom: '4px'
              }}>
                🌊 实数海洋沙盘
              </h2>
              <p style={{
                fontSize: '12px',
                color: 'rgba(224, 224, 255, 0.6)'
              }}>
                可视化 &quot;超越数几乎占满实数轴&quot; — 蓝色=超越数, 红色=代数数, 金色=刘维尔数
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
                  粒子数量
                </label>
                <input
                  type="text"
                  value={particleCount}
                  onChange={(e) => setParticleCount(parseInt(e.target.value.replace(/[^\d]/g, '')) || 1000)}
                  style={{
                    width: '80px',
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
                  显示范围
                </label>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={viewRange.min}
                    onChange={(e) => setViewRange(prev => ({ ...prev, min: Math.max(1, parseInt(e.target.value.replace(/[^\d]/g, '')) || 1) }))}
                    style={{
                      width: '60px',
                      padding: '6px 8px',
                      fontSize: '13px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(100, 150, 255, 0.3)',
                      borderRadius: '6px',
                      color: '#e0e0ff',
                      outline: 'none',
                      fontFamily: 'Consolas, Monaco, monospace'
                    }}
                  />
                  <span style={{ color: 'rgba(224, 224, 255, 0.5)' }}>~</span>
                  <input
                    type="text"
                    value={viewRange.max}
                    onChange={(e) => setViewRange(prev => ({ ...prev, max: Math.max(prev.min + 10, parseInt(e.target.value.replace(/[^\d]/g, '')) || 100) }))}
                    style={{
                      width: '60px',
                      padding: '6px 8px',
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
              </div>

              <button
                onClick={loadParticles}
                disabled={loading}
                style={{
                  padding: '8px 18px',
                  fontSize: '13px',
                  fontWeight: 600,
                  background: 'linear-gradient(135deg, #ffd700, #ff8c00)',
                  color: '#000',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  marginTop: '18px'
                }}
              >
                {loading ? '生成中...' : '重新生成'}
              </button>
            </div>
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

        <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
          <div
            ref={containerRef}
            style={{
              width: '100%',
              height: '100%',
              background: 'rgba(0, 0, 0, 0.4)',
              borderRadius: '16px',
              border: '1px solid rgba(100, 150, 255, 0.2)',
              backdropFilter: 'blur(10px)',
              overflow: 'hidden'
            }}
          />

          {hoveredValue !== null && (
            <div style={{
              position: 'absolute',
              top: '16px',
              left: '16px',
              padding: '8px 16px',
              background: 'rgba(255, 215, 0, 0.2)',
              border: '1px solid rgba(255, 215, 0, 0.5)',
              borderRadius: '8px',
              color: '#ffd700',
              fontSize: '13px',
              fontWeight: 600,
              backdropFilter: 'blur(5px)'
            }}>
              🌟 刘维尔数位: 第 {hoveredValue.toLocaleString('zh-CN')} 位 = 1
            </div>
          )}

          {loading && particles.length === 0 && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: '18px',
              color: 'rgba(224, 224, 255, 0.6)',
              textAlign: 'center'
            }}>
              <div style={{
                width: '50px',
                height: '50px',
                border: '4px solid rgba(255, 215, 0, 0.2)',
                borderTopColor: '#ffd700',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 16px'
              }} />
              正在生成实数海洋...
              <style>{`
                @keyframes spin {
                  to { transform: rotate(360deg); }
                }
              `}</style>
            </div>
          )}
        </div>
      </div>

      <div style={{
        width: '320px',
        background: 'rgba(0, 0, 0, 0.4)',
        borderRadius: '16px',
        padding: '20px',
        border: '1px solid rgba(100, 150, 255, 0.2)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              padding: '10px',
              background: 'rgba(79, 195, 247, 0.05)',
              borderRadius: '8px',
              border: '1px solid rgba(79, 195, 247, 0.15)'
            }}>
              <input
                type="checkbox"
                checked={showTranscendental}
                onChange={(e) => setShowTranscendental(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#4fc3f7' }}
              />
              <span style={{ fontSize: '13px', color: '#4fc3f7' }}>🔵 显示超越数</span>
            </label>

            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              padding: '10px',
              background: 'rgba(255, 107, 107, 0.05)',
              borderRadius: '8px',
              border: '1px solid rgba(255, 107, 107, 0.15)'
            }}>
              <input
                type="checkbox"
                checked={showAlgebraic}
                onChange={(e) => setShowAlgebraic(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#ff6b6b' }}
              />
              <span style={{ fontSize: '13px', color: '#ff6b6b' }}>🔴 显示代数数</span>
            </label>

            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              padding: '10px',
              background: 'rgba(255, 215, 0, 0.05)',
              borderRadius: '8px',
              border: '1px solid rgba(255, 215, 0, 0.15)'
            }}>
              <input
                type="checkbox"
                checked={showLiouville}
                onChange={(e) => setShowLiouville(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#ffd700' }}
              />
              <span style={{ fontSize: '13px', color: '#ffd700' }}>🟡 显示刘维尔数</span>
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
                checked={autoRotate}
                onChange={(e) => setAutoRotate(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#4fc3f7' }}
              />
              <span style={{ fontSize: '13px', color: 'rgba(224, 224, 255, 0.8)' }}>自动旋转</span>
            </label>
          </div>

          <div style={{ marginTop: '12px' }}>
            <label style={{
              fontSize: '11px',
              color: 'rgba(224, 224, 255, 0.7)',
              marginBottom: '6px',
              display: 'block'
            }}>
              粒子大小: {particleSize.toFixed(1)}
            </label>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.1"
              value={particleSize}
              onChange={(e) => setParticleSize(parseFloat(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
            />
          </div>
        </div>

        <div>
          <h3 style={{
            fontSize: '16px',
            color: '#64b5f6',
            marginBottom: '12px'
          }}>
            📊 分布统计
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{
              padding: '10px 12px',
              background: 'rgba(79, 195, 247, 0.1)',
              borderRadius: '8px',
              border: '1px solid rgba(79, 195, 247, 0.2)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: 'rgba(224, 224, 255, 0.6)' }}>超越数</span>
                <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#4fc3f7' }}>
                  {transcendentalCount.toLocaleString('zh-CN')}
                </span>
              </div>
              <div style={{
                marginTop: '4px',
                height: '4px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '2px',
                overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  background: '#4fc3f7',
                  width: `${particles.length > 0 ? (transcendentalCount / particles.length * 100).toFixed(1) : 0}%`
                }} />
              </div>
              <div style={{ fontSize: '10px', color: 'rgba(224, 224, 255, 0.4)', marginTop: '2px' }}>
                {particles.length > 0 ? (transcendentalCount / particles.length * 100).toFixed(1) : 0}% — 几乎全部
              </div>
            </div>

            <div style={{
              padding: '10px 12px',
              background: 'rgba(255, 107, 107, 0.1)',
              borderRadius: '8px',
              border: '1px solid rgba(255, 107, 107, 0.2)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: 'rgba(224, 224, 255, 0.6)' }}>代数数</span>
                <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#ff6b6b' }}>
                  {algebraicCount.toLocaleString('zh-CN')}
                </span>
              </div>
              <div style={{
                marginTop: '4px',
                height: '4px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '2px',
                overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  background: '#ff6b6b',
                  width: `${particles.length > 0 ? (algebraicCount / particles.length * 100).toFixed(3) : 0}%`
                }} />
              </div>
              <div style={{ fontSize: '10px', color: 'rgba(224, 224, 255, 0.4)', marginTop: '2px' }}>
                {particles.length > 0 ? (algebraicCount / particles.length * 100).toFixed(3) : 0}% — 测度为0
              </div>
            </div>

            <div style={{
              padding: '10px 12px',
              background: 'rgba(255, 215, 0, 0.1)',
              borderRadius: '8px',
              border: '1px solid rgba(255, 215, 0, 0.2)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: 'rgba(224, 224, 255, 0.6)' }}>刘维尔数</span>
                <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#ffd700' }}>
                  {liouvilleCount}
                </span>
              </div>
              <div style={{
                marginTop: '4px',
                height: '4px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '2px',
                overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  background: '#ffd700',
                  width: `${particles.length > 0 ? (liouvilleCount / particles.length * 100).toFixed(4) : 0}%`
                }} />
              </div>
              <div style={{ fontSize: '10px', color: 'rgba(224, 224, 255, 0.4)', marginTop: '2px' }}>
                {particles.length > 0 ? (liouvilleCount / particles.length * 100).toFixed(4) : 0}% — 超越数特例
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 style={{
            fontSize: '16px',
            color: '#81c784',
            marginBottom: '12px'
          }}>
            🔍 点击查询
          </h3>

          <ProgressBar progress={queryProgress} visible={queryLoading} />

          {selectedInfo && (
            <div style={{
              padding: '12px',
              background: selectedInfo.type === 'liouville'
                ? 'rgba(255, 215, 0, 0.1)'
                : selectedInfo.type === 'transcendental'
                ? 'rgba(79, 195, 247, 0.1)'
                : 'rgba(255, 107, 107, 0.1)',
              borderRadius: '10px',
              border: `1px solid ${selectedInfo.type === 'liouville'
                ? 'rgba(255, 215, 0, 0.4)'
                : selectedInfo.type === 'transcendental'
                ? 'rgba(79, 195, 247, 0.4)'
                : 'rgba(255, 107, 107, 0.4)'}`,
              marginBottom: '12px'
            }}>
              <div style={{
                fontSize: '12px',
                color: 'rgba(224, 224, 255, 0.6)',
                marginBottom: '4px'
              }}>
                数值: {selectedInfo.value.toLocaleString('zh-CN')}
              </div>
              <div style={{
                fontSize: '18px',
                fontWeight: 'bold',
                color: selectedInfo.type === 'liouville'
                  ? '#ffd700'
                  : selectedInfo.type === 'transcendental'
                  ? '#4fc3f7'
                  : '#ff6b6b',
                marginBottom: '8px'
              }}>
                {selectedInfo.typeDescription}
              </div>
              <div style={{
                fontSize: '11px',
                color: 'rgba(224, 224, 255, 0.5)',
                lineHeight: 1.6
              }}>
                {selectedInfo.explanation}
              </div>
              <div style={{
                marginTop: '8px',
                fontSize: '10px',
                color: 'rgba(224, 224, 255, 0.4)'
              }}>
                置信度: {(selectedInfo.confidence * 100).toFixed(1)}%
              </div>
            </div>
          )}

          {queryResult && (
            <div style={{
              padding: '12px',
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '10px',
              border: '1px solid rgba(100, 150, 255, 0.2)',
              fontSize: '11px',
              color: 'rgba(224, 224, 255, 0.7)'
            }}>
              <div style={{ marginBottom: '6px', fontWeight: 600, color: '#64b5f6' }}>
                区间 [{(queryResult.centerValue - queryResult.range).toLocaleString('zh-CN')},
                {(queryResult.centerValue + queryResult.range).toLocaleString('zh-CN')}]
              </div>
              <div style={{ lineHeight: 1.8 }}>
                <div>超越数密度: ~{(queryResult.transcendentalDensity * 100).toFixed(3)}%</div>
                <div>代数数密度: ~{(queryResult.algebraicDensity * 100).toFixed(5)}%</div>
                <div>刘维尔 1 数位: {queryResult.liouvilleCount} 个</div>
              </div>
              {queryResult.liouvilleChecks.filter(c => c.isFactorial).length > 0 && (
                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <div style={{ color: '#ffd700', fontWeight: 600, marginBottom: '4px' }}>
                    🌟 发现刘维尔数位:
                  </div>
                  {queryResult.liouvilleChecks.filter(c => c.isFactorial).map((c, i) => (
                    <div key={i} style={{ color: '#ffd700', fontSize: '10px' }}>
                      第 {c.position.toLocaleString('zh-CN')} 位 = 1
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!selectedInfo && !queryLoading && (
            <div style={{
              padding: '12px',
              fontSize: '11px',
              color: 'rgba(224, 224, 255, 0.5)',
              lineHeight: 1.6,
              fontStyle: 'italic'
            }}>
              点击 3D 场景中的任意位置，查看该区域的实数分类信息...
            </div>
          )}
        </div>

        <div>
          <h3 style={{
            fontSize: '16px',
            color: '#ffb74d',
            marginBottom: '12px'
          }}>
            💡 数学原理
          </h3>
          <div style={{
            fontSize: '11px',
            color: 'rgba(224, 224, 255, 0.6)',
            lineHeight: 1.8
          }}>
            <p style={{ marginBottom: '8px' }}>
              <strong style={{ color: '#64b5f6' }}>测度论</strong>：在实数轴上随机选取一点，
              该点为<strong style={{ color: '#ff6b6b' }}>代数数</strong>的概率为<strong style={{ color: '#ff6b6b' }}>0</strong>，
              而为<strong style={{ color: '#4fc3f7' }}>超越数</strong>的概率为<strong style={{ color: '#4fc3f7' }}>1</strong>。
            </p>
            <p style={{ marginBottom: '8px' }}>
              虽然代数数有无穷多个（可数无穷），但在整个实数轴上，它们的&quot;总长度&quot;（勒贝格测度）为 0。
            </p>
            <p style={{ marginBottom: '8px' }}>
              <strong style={{ color: '#ffd700' }}>刘维尔数</strong>是第一个被证明的超越数，
              它的小数部分中，只有阶乘位置是 1，其余都是 0。
            </p>
            <p>
              刘维尔数只是不可数多个超越数中的一个特例——
              <strong style={{ color: '#4fc3f7' }}>几乎所有实数都是超越数</strong>！
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RealNumberOcean
