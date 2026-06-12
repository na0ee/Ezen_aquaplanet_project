# Reference System Notes

> 이 파일은 누적 기록용입니다. 새 분석은 기존 내용을 지우지 말고 아래에 날짜/브랜드 기준으로 추가하세요.

---

## [2026-06-11] 아쿠아플라넷 (Aqua Planet) — 1차 프로젝트 메인 페이지

### 0. 메타 정보
- **기준 레퍼런스 URL**: https://www.figma.com/design/21hipFHORIVPs0iSUFxfvk/1%EC%B0%A8%ED%94%84%EB%A1%9C%EC%A0%9D%ED%8A%B8--1%EC%A1%B0?node-id=835-889&m=dev
- **fileKey**: `21hipFHORIVPs0iSUFxfvk`
- **분석 노드**: `835:889` (Section 1) 하위 `835:157` (main_최종, 1920 × 11673 단일 롱페이지)
- **캡처/측정 방법**: Figma Dev Mode MCP `get_metadata`(구조) + `get_design_context`(노드별 실측 코드/스크린샷) + `get_variable_defs`(토큰 확인). 추출값은 Figma가 반환한 노드 속성(폰트/크기/자간/패딩/컬러/라운드)을 그대로 사용. 감/기본값 미사용.
- **확인한 섹션**: sec.intro(Hero) `835:351` / sec.walus(Our Crew) `835:323` / sec.booking(Book now) `835:176` / sec.program(Today's Program) `835:246`
- **중요**: 이 파일에는 **Figma 변수(디자인 토큰)가 정의돼 있지 않음** (`get_variable_defs` = `{}`). 모든 값은 노드에 박힌 raw 값이며, 토큰화는 우리 쪽에서 새로 설계해야 함.

---

### 1. 핵심 항목 추출표

| 항목 | 추출값 | 근거/확인 위치 | 확정 여부 | 우리 브랜드 적용 기준 |
|---|---|---|---|---|
| 폰트명 (영문 디스플레이) | **Poppins** | Hero "aqua planet" `835:357`, 네비, 버튼 | 확정 | 영문 헤드라인·UI 기본 |
| 폰트명 (영문 세리프 강조) | **EB Garamond** (Italic 다수) | 섹션타이틀 2번째 단어, 네비 active, 카드명 | 확정 | 강조어/포인트 세리프 |
| 폰트명 (국문) | **Pretendard** | Hero 서브, 카드 본문, 버튼 한글 `835:359` 등 | 확정 | 국문 본문·UI 전체 |
| 폰트 두께 | Poppins **Light(300)/Regular(400)/Medium(500)**, EB Garamond **Regular/Medium/Medium Italic**, Pretendard **Regular(400)/Medium(500)** | 각 텍스트 노드 | 확정 | 동일 weight 세트 유지 |
| Hero Title 크기/줄간격/자간 | **128px / line-height 1.4 / -2.56px(≈-0.02em)** · Poppins Medium · #FFFFFF | "aqua planet" `835:357` | 확정 | 데스크탑 H0 |
| Hero Eyebrow | **32px / 1.4 / -0.64px(-0.02em)** · EB Garamond Medium Italic | "Welcome to" `835:355` | 확정 | Hero 상단 라벨 |
| Hero Sub(국문) | **32px / 1.4 / -0.64px(-0.02em)** · Pretendard Medium | `835:359` | 확정 | Hero 보조문 |
| Section Title 크기/줄간격/자간 | **혼합: 1번째 단어 Poppins Light 42px(-1.68px/-0.04em) + 2번째 단어 EB Garamond Medium Italic 48px(-1.92px/-0.04em)** · #FFFFFF | "Our Crew" `835:348`, "Book now" `835:179`, "Today's Program" `835:272` | 확정 | 모든 섹션 타이틀 공통 패턴 |
| Section Sub | **18px / line-height normal / -0.36px(-0.02em)** · Pretendard Regular · #FFFFFF | `835:350`, `835:181`, `835:274` | 확정 | 섹션 타이틀 보조문 |
| Body(카드 본문) | **16px / 1.4 / -0.32px(-0.02em)** · Pretendard Regular/Medium · #FFFFFF | `835:338~342` | 확정 | 본문 기준 |
| Card Caption(프로그램) | **20px / line-height normal / 자간 0** · Pretendard Regular · #FFFFFF center | `835:255` 등 | 확정 | 이미지카드 캡션 |
| Card 동물명 | **48px / 1.4 / -0.96px(-0.02em)** · EB Garamond Medium | "Walrus" `835:332` | 확정 | 콘텐츠 카드 헤드 |
| Section Padding (좌우) | **좌우 380px** → 컨테이너 1160px 중앙정렬 (1920 기준) | sec.booking `835:177` left380/w1160 | 확정 | 좌우 거터 = (vw−1160)/2 |
| Section Padding (수직 리듬) | 섹션 높이 **1080px**(풀뷰포트형), 타이틀 top **160px**, 타이틀→콘텐츠 **80px**(booking)/타이틀160→카드337(program) | `835:176`,`835:246` | 확정 | 섹션=1080 기준 리듬 |
| Container Width / Grid / Gutter | **컨테이너 1160px**, **비대칭 2열**(카드폭 630 / 514 / 612 혼합), **gutter ≈ 16px(가로)·14~16px(세로)** | booking·program 카드 좌표 | 확정 | 1160 컨테이너·비대칭 2열 |
| Card Padding | **Program 카드 24px(p-24)**, **Booking 카드 16px(p-16)**, 글래스 정보카드 76px(가로)/36px(세로) | `835:249`,`835:183`,`835:328` | 확정 | 용도별 분리(이미지24/예매16) |
| Card Gap | **≈16px** (가로·세로 14~16px) | 카드 좌표 차 | 확정 | 16px 기준 |
| Card Radius | **14px**(콘텐츠/글래스카드), **16px**(booking 이미지카드) | rounded 값 | 확정 | 14/16px 두 단계 |
| Image Ratio | 카드 프레임 비율 **532×400(≈4:3)** 및 **612×400(≈3:2)** 혼합, `object-cover`로 채움 + 하단 검정 그라데이션 | program/booking 카드 | 확정 | 4:3 / 3:2 혼합, object-cover |
| Button Height / Padding / Radius | **인카드 CTA: H32 / px16·py6(또는 pl16 pr12) / radius 24px**, **GNB Ticket: H54 / px22 / radius 100px** | `835:769`,`835:768`,`835:771` | 확정 | CTA=32/24, 네비버튼=54/pill |
| 주요 컬러 HEX | **Primary #22B2EA** (오션 시안) | 버튼 bg/텍스트/보더 `835:401`,`835:396` | 확정 | 브랜드 포인트 컬러 |
| 텍스트 컬러 | **#FFFFFF** (기본), 비활성 nav **rgba(255,255,255,0.5)** | 전 텍스트 노드 | 확정 | 다크 배경 위 화이트 |
| 배경(섹션 바닥) | 레퍼런스는 딥 오션 이미지 풀블리드(`835:158`). **우리 기준 솔리드 배경 = #FFFFFF (결정)** | 배경 노드 + 2026-06-11 결정 | 확정 | 솔리드 #FFFFFF, 실제로는 이미지로 덮음 |

---

### 2. 글래스모피즘(Glassmorphism) 토큰 — 확정

| 속성 | 값 | 근거 |
|---|---|---|
| backdrop-blur | **15px** | `835:762` 등 glass-stroke 전체 |
| border | **1px~2px solid rgba(255,255,255,0.1)** | glass-stroke / 정보카드 |
| 정보카드 그라데이션 | `linear-gradient(201deg, rgba(255,255,255,0) 1.6%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0) 98.4%)` | `835:328` |
| 이미지카드 베이스 오버레이 | **rgba(255,255,255,0.1)** (program) / **rgba(255,255,255,0.34)** (booking) | `835:256`,`835:183` |
| 이미지카드 하단 그라데이션 | `linear-gradient(to bottom, rgba(0,0,0,0) → rgba(0,0,0,0.56~0.7))` | program/booking 카드 |
| 라운드 | **14px**(글래스카드) / **16px**(이미지카드) | rounded 값 |

---

### 3. 레이아웃 분석

| 섹션 | 구조 | 타이포 특징 | 이미지/영상 방식 | 여백 리듬 | 인터랙션 | 적용 시 주의점 |
|---|---|---|---|---|---|---|
| Hero(intro) | GNB(상단고정형) + 중앙 대형 타이틀 + 스크롤 인디케이터 | Poppins 128px + EB Garamond Italic eyebrow + Pretendard 국문 | 풀블리드 배경 이미지 위 화이트 텍스트 | 타이틀 top 270, 요소 gap 24~30px | 'Let's Explore' 스크롤 유도(세로 라인) | 배경 위 대비 확보 필수 |
| Our Crew(walus/beluga/whaleshark) | 좌우 교차 배치(이미지 PNG + 글래스 정보카드) | 카드명 EB Garamond 48px + 국문 Pretendard 16px | 누끼 PNG 자유배치 + 정보카드 backdrop-blur | 타이틀 top 90~160, 카드 내부 gap 26px | 'btn'(보러가기) CTA | 누끼 이미지 배경과 자연스럽게 합성 |
| Today's Program | 비대칭 2×2 이미지카드 그리드 | 캡션 Pretendard 20px center | 풀블리드 이미지 + 하단 검정 그라데이션 + 글래스 보더 | 컨테이너 1160, gap 16, 카드 p24 | sec.program_hover 별도 존재(호버 상태 설계됨) | 캡션 가독성 위해 하단 그라데이션 유지 |
| Explore the Sea(location) | 한국 지도(벡터) + 지점 마커 + 이미지 | 동일 타이틀 패턴 | SVG 지도 벡터 + 이미지 | 타이틀 top 160 | sec.location_hover 별도 존재(지점 호버) | 지도 벡터는 SVG로 유지 |
| Book now(booking) | 비대칭 2×2 이미지카드(지점 4개) | 타이틀 패턴 + 지점라벨 Pretendard 16px | 풀블리드 이미지 + 검정 그라데이션 | 컨테이너 1160, 타이틀→그리드 80px, 카드 p16 | 예매하기 CTA(아웃라인/솔리드 2종) | CTA 2가지 변형 일관 관리 |

---

### 4. 추출 후 적용 기준

| 항목 | 기준 레퍼런스에서 확인한 값 | 리뉴얼 브랜드 적용 기준 | Figma style/token 이름(제안) | 구현 시 주의점 |
|---|---|---|---|---|
| 디자인 키워드 | 다크 오션 · 글래스모피즘 · 영문 세리프 이탤릭 포인트 · 풀블리드 수중 사진 | 동일 무드 유지 | — | 과한 효과 남발 금지 |
| 컬러 팔레트 | Primary #22B2EA / 텍스트 #FFFFFF / 흰색 투명도 단계(0.02·0.1·0.34·0.5) / 검정 오버레이(0.56·0.7) | 동일 팔레트 | `color/primary`, `color/text/onDark`, `color/overlay/white-xx`, `color/overlay/black-xx` | 배경 정확 HEX는 **확인 필요** |
| 이미지/영상 방향 | 풀블리드 수중 사진, object-cover, 하단 검정 그라데이션, 누끼 PNG 자유배치 | 동일 | `effect/card-gradient-bottom` | 저화질 사진 금지 |
| 버튼/CTA/메뉴 스타일 | CTA H32·radius24(화이트/시안솔리드/시안아웃라인 3종) · GNB pill H54·radius100 | 3종 CTA 변형 규격화 | `button/cta`, `button/cta-outline`, `button/nav-pill` | 아이콘 18~24px 동반 |
| 스크롤/호버/전환 인터랙션 무드 | 스크롤 인디케이터, program/location hover 프레임 존재 | 차분한 페이드/호버 강조 | — | 호버 상세값은 **확인 필요** |
| 모바일에서 유지할 시각 품질 | (이 파일에 모바일 프레임 없음) | 글래스·대비·포인트컬러 유지 | — | 모바일 규격 **확인 필요** |
| 피해야 할 디자인 방향 | 라이트 배경, 무채색 only, 산세리프 일변도, 카드 무그라데이션 | 다크·시안·세리프이탤릭 정체성 훼손 금지 | — | 라이트 테마로 전환 금지 |

---

### 5. 확정값 / 확인 필요값 분리

**✅ 확정값 (다음 단계 토큰으로 사용 가능)**
- 폰트 3종: Poppins / EB Garamond / Pretendard + weight 세트
- 타이포 스케일: 128 / 48·42 / 32 / 20 / 18 / 16px
- 자간 규칙: 본문/디스플레이 -0.02em, 섹션타이틀·네비 -0.04em
- line-height: 본문·타이틀 1.4, 섹션 서브 normal
- Primary 컬러 #22B2EA, 텍스트 #FFFFFF
- 흰색 투명도 단계: 0.02 / 0.1 / 0.34 / 0.5
- 검정 오버레이: 0.56 / 0.7
- 글래스: backdrop-blur 15px, border 1~2px rgba(255,255,255,0.1)
- 컨테이너 1160px, 좌우 거터 380px(@1920)
- 카드 라운드 14/16px, gap 16px, 패딩 24px(이미지)/16px(예매)/76·36px(정보)
- 버튼: CTA H32/radius24, GNB pill H54/radius100
- 이미지: object-cover, 4:3·3:2 혼합, 하단 검정 그라데이션

**⚠️→✅ 결정 완료 (2026-06-11 업데이트)**
- **섹션 배경 HEX = `#FFFFFF`** (실제로는 이미지로 덮으므로 솔리드는 흰색 베이스로 확정)
- **모바일/태블릿 = 미제작 결정**. 데스크탑(1920 기준)만 구현. 브레이크포인트 토큰 불필요.
- **폰트 = HTML/CSS 링크 로딩 방식 확정** (아래 8절 참고). 로컬 폰트 파일 동봉 불필요.

**⚠️ 남은 확인 필요값 (토큰 확정 금지)**
- **호버/전환 인터랙션 수치 = 미정**. 아직 안 정함. duration·easing·변화량(밝기/확대 등) 추후 결정. 레퍼런스에 `sec.program_hover`·`sec.location_hover` 프레임이 존재하므로 참고 가능.

---

### 6. 다음 단계에서 절대 임의로 바꾸면 안 되는 값
1. **Primary 컬러 #22B2EA** (브랜드 포인트)
2. **다크 배경 + 화이트 텍스트** 대비 구조
3. **섹션 타이틀 혼합 타입 규칙**(Poppins Light + EB Garamond Medium Italic)
4. **글래스모피즘 규격**(blur 15px, border rgba(255,255,255,0.1))
5. **컨테이너 1160px**
6. **버튼 radius 24px(CTA) / 100px(pill)**
7. **카드 하단 검정 그라데이션 + object-cover** 이미지 처리

### 7. Figma 디자인 적용 우선순위
1순위: 컬러 토큰(#22B2EA, 화이트/투명도 단계) + 타입 스타일 8종
2순위: 글래스모피즘 effect 스타일 + 카드 컴포넌트(14/16px, p24/16)
3순위: 버튼 컴포넌트 3종(CTA solid/outline, nav pill)
4순위: 컨테이너/그리드 레이아웃 그리드(1160 / 좌우380)
5순위: 섹션 템플릿(1080 높이, 타이틀 top160, 콘텐츠 gap80)

---

### 8. 폰트 로딩 — HTML/CSS 링크 방식 (결정)

**`<head>`에 삽입**
```html
<!-- Pretendard (국문) -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@latest/dist/web/static/pretendard.css" />

<!-- Poppins + EB Garamond (영문) - Google Fonts -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;1,500&family=Poppins:wght@300;400;500&display=swap" rel="stylesheet" />
```

**CSS font-family 적용**
```css
:root{
  --font-en: "Poppins", sans-serif;          /* 영문 디스플레이/UI */
  --font-serif: "EB Garamond", serif;         /* 세리프 이탤릭 강조 */
  --font-kr: "Pretendard", sans-serif;        /* 국문 본문/UI */
}
/* 필요 weight: Poppins 300/400/500, EB Garamond 400/500/500italic, Pretendard 400/500 */
```

> 위 Google Fonts 쿼리는 추출한 사용 weight(Poppins 300·400·500 / EB Garamond 400·500·500italic)만 요청하도록 구성됨. Pretendard는 jsdelivr CDN 정적 css 사용. 로컬 폰트 파일 동봉 불필요.

---
