import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

/**
 * 심볼 로고 (바다 생물들).
 * Blender에서 내보낸 '흩어졌다 → 원래 배열로 복귀' 애니메이션을
 * 스크롤 progress(0~1)로 스크럽한다.
 *
 *  - 자동재생 X. 수동 mixer + mixer.setTime() 으로만 시간 제어
 *    (drei useAnimations의 자동 mixer.update(delta)와 충돌 방지)
 *  - progress: 부모가 넘겨주는 useRef (0~1)
 */
export default function LogoSymbol({ progress }) {
  const { scene, animations } = useGLTF('/logo_symbol.glb')

  // 수동 mixer
  const mixer = useMemo(() => new THREE.AnimationMixer(scene), [scene]) 
  const duration = useRef(0)

  useEffect(() => {
    // 생물이 개별 오브젝트라 클립이 여러 개일 수 있음 → 전부 재생
    animations.forEach((clip) => {
      mixer.clipAction(clip).play()
      duration.current = Math.max(duration.current, clip.duration)
    })

    // === 유리 재질 ===
    // 이미 구현해둔 MeshTransmissionMaterial 등을 여기서 메쉬에 입히면 됨:
    //   scene.traverse((o) => { if (o.isMesh) o.material = glassMaterial })
    // 모바일에선 samples/resolution 낮춘 버전으로 분기 권장.

    return () => mixer.stopAllAction()
  }, [animations, mixer, scene])

  // 매 프레임 스크롤 위치로 타임라인 스크럽 (mixer.update(delta) 호출 금지!)
  useFrame(() => {
    mixer.setTime(progress.current * duration.current)
  })

  return <primitive object={scene} />
}

useGLTF.preload('/logo_symbol.glb')
