import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { useLayoutEffect, useMemo } from 'react'

const DEFAULT_MODEL_URL = '/models/sea_creatures.glb'
const DEFAULT_AMPLITUDE = 0.1
const DEFAULT_SPEED = 0.85
const DEFAULT_OFFSET_STEP = 0.7
const DEFAULT_ROTATION_Z = 0.04

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  )
}

function collectMeshes(root, amplitude, speed, offsetStep) {
  const meshes = []
  const baseY = []
  const baseRotZ = []
  const amplitudes = []
  const speeds = []
  const offsets = []

  root.traverse((object) => {
    if (!object.isMesh) return

    const index = meshes.length
    const offset = index * offsetStep
    const ampVariation = 0.75 + (index % 5) * 0.1
    const speedVariation = 0.88 + (index % 7) * 0.04

    meshes.push(object)
    baseY.push(object.position.y)
    baseRotZ.push(object.rotation.z)
    amplitudes.push(amplitude * ampVariation)
    speeds.push(speed * speedVariation)
    offsets.push(offset)
  })

  return { meshes, baseY, baseRotZ, amplitudes, speeds, offsets }
}

export default function SeaCreatures({
  url = DEFAULT_MODEL_URL,
  amplitude = DEFAULT_AMPLITUDE,
  speed = DEFAULT_SPEED,
  offsetStep = DEFAULT_OFFSET_STEP,
  rotationZ = DEFAULT_ROTATION_Z,
  respectReducedMotion = true,
  enabled = true,
  ...props
}) {
  const gltf = useGLTF(url)
  const root = useMemo(() => gltf.scene.clone(true), [gltf.scene])
  const reduceMotion = useMemo(() => {
    return respectReducedMotion && prefersReducedMotion()
  }, [respectReducedMotion])

  const animation = useMemo(() => {
    return collectMeshes(root, amplitude, speed, offsetStep)
  }, [root, amplitude, speed, offsetStep])

  useLayoutEffect(() => {
    const { meshes, baseY, baseRotZ } = animation

    for (let i = 0; i < meshes.length; i += 1) {
      meshes[i].position.y = baseY[i]
      meshes[i].rotation.z = baseRotZ[i]
    }
  }, [animation])

  useFrame(({ clock }) => {
    if (!enabled || reduceMotion) return

    const t = clock.getElapsedTime()
    const { meshes, baseY, baseRotZ, amplitudes, speeds, offsets } = animation

    for (let i = 0; i < meshes.length; i += 1) {
      const mesh = meshes[i]
      const wave = t * speeds[i] + offsets[i]

      mesh.position.y = baseY[i] + Math.sin(wave) * amplitudes[i]
      mesh.rotation.z = baseRotZ[i] + Math.sin(t * speeds[i] * 0.5 + offsets[i]) * rotationZ
    }
  })

  return <primitive object={root} {...props} />
}

useGLTF.preload(DEFAULT_MODEL_URL)
