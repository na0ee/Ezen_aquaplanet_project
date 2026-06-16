import { Canvas } from '@react-three/fiber'
import { Suspense, useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import LogoSymbol from './LogoSymbol'
import './hero-logo.css'

gsap.registerPlugin(ScrollTrigger)

/**
 * 스크롤 트랜지션:
 *   하나의 ScrollTrigger progress(0~1) →
 *     ① R3F: 생물들이 흩어졌다 다시 로고로 모이는 안무 (LogoSymbol)
 *     ② CSS: 심볼 캔버스를 화면 중앙 → 헤더 슬롯으로 이동 + 헤더 크기로 축소
 *     ③ 글자(wordmark)는 고정돼 있다가 후반부에 페이드아웃
 *
 * 착지 위치/크기는 .header-logo-slot 을 getBoundingClientRect로 '측정'해서 잡으므로
 * 모든 기기(모바일/태블릿/데스크탑)에서 그 기기의 헤더 로고 자리에 정확히 안착한다.
 */
export default function HeroLogo() {
  const wrapRef = useRef(null)   // 심볼 캔버스 래퍼 (GSAP이 transform 소유)
  const progress = useRef(0)     // 스크롤 진행도 0~1 → R3F로 전달

  useLayoutEffect(() => {
    const wrap = wrapRef.current
    const slot = document.querySelector('.header-logo-slot')
    if (!wrap || !slot) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const ctx = gsap.context(() => {
      let end = { dx: 0, dy: 0, scale: 1 }

      // 헤더 슬롯 기준으로 이동량/축소율 측정 (리사이즈마다 재실행)
      const measure = () => {
        const prev = wrap.style.transform
        wrap.style.transform = 'none'                  // 변형 제거한 기준 박스
        const l = wrap.getBoundingClientRect()
        const s = slot.getBoundingClientRect()
        wrap.style.transform = prev
        end = {
          dx: (s.left + s.width / 2) - (l.left + l.width / 2),
          dy: (s.top + s.height / 2) - (l.top + l.height / 2),
          scale: s.width / l.width,                    // 헤더 크기에 딱 맞게
        }
      }
      measure()

      // 모션 줄이기: 트랜지션 없이 바로 헤더 상태로
      if (reduceMotion) {
        gsap.set(wrap, { x: end.dx, y: end.dy, scale: end.scale })
        gsap.set('.wordmark', { autoAlpha: 0 })
        progress.current = 1
        return
      }

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: '#hero',
          start: 'top top',
          end: 'bottom top',
          scrub: 0.5,                                  // 약간 smoothing
          invalidateOnRefresh: true,
          onRefreshInit: measure,                      // 값 재평가 직전 재측정
          onUpdate: (self) => { progress.current = self.progress },  // R3F 동기화
        },
      })

      // 심볼: 중앙 → 헤더 (함수형 값 → 리사이즈 때 재계산)
      tl.to(wrap, {
        x: () => end.dx,
        y: () => end.dy,
        scale: () => end.scale,
        ease: 'none',
        duration: 1,
      }, 0)

      // 글자: 후반 40% 구간에서 사라짐
      tl.to('.wordmark', {
        autoAlpha: 0,
        ease: 'none',
        duration: 0.4,
      }, 0.6)
    })

    return () => ctx.revert()
  }, [])

  return (
    <>
      {/*
        헤더: 실제 프로젝트 헤더에는 .header-logo-slot '빈 박스'만 두면 된다.
        헤더는 상단 고정(fixed/sticky)이어야 슬롯 좌표가 안정적이고,
        트랜지션 끝에서 심볼이 그 자리에 정확히 머문다.
      */}
      <header className="site-header">
        <div className="header-logo-slot" aria-hidden="true" />
        {/* 헤더 메뉴 등... */}
      </header>

      {/* 심볼 캔버스 — 화면 중앙 고정, GSAP이 위치/크기 제어 */}
      <div className="symbol-wrap" ref={wrapRef}>
        <Canvas
          dpr={[1, 2]}                                 /* 레티나 과다 렌더 방지 */
          gl={{ alpha: true }}                         /* 투명 배경 */
          camera={{ position: [0, 0, 6], fov: 35 }}    /* 모델 크기에 맞게 조절 */
        >
          <ambientLight intensity={0.6} />
          <directionalLight position={[3, 5, 4]} intensity={1.2} />
          <Suspense fallback={null}>
            <LogoSymbol progress={progress} />
          </Suspense>
        </Canvas>
      </div>

      {/* 글자(aqua planet) — 트랜지션 동안 고정 */}
      <div className="wordmark">
        {/* 실제 에셋으로 교체 (SVG/PNG 권장: 또렷함) */}
        <img src="/wordmark.svg" alt="aqua planet" />
      </div>

      {/* 스크롤 거리 확보용 hero 섹션 (높이 = 트랜지션 길이) */}
      <section id="hero" />

      {/* ↓ 이 아래로 실제 페이지 콘텐츠 */}
    </>
  )
}
