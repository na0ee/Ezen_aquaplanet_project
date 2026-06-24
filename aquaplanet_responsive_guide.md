# Aqua Planet 반응형 적용 가이드

> 다른 페이지에도 동일하게 적용할 수 있도록 정리한 태블릿/모바일 반응형 기준입니다.  
> 기존 메인 페이지 CSS의 반응형 기준을 바탕으로, 현재 프로젝트 기준은 PC `1025px 이상`, 태블릿 `769px ~ 1024px`, 모바일 `390px ~ 768px`로 정리합니다.
> 반응형을 편집할 때 마다 이 문서에 추가할 사항이 있는지 검토합니다.

---

## 1. Breakpoint 기준

| 구분 | 화면 너비 | 적용 방식 |
|---|---:|---|
| PC | 1025px 이상 | 기본 데스크탑 레이아웃 유지 |
| Tablet | 769px ~ 1024px | 2열 구조 유지, 폰트/여백/카드 크기 축소 |
| Mobile | 390px ~ 768px | 1열 구조 전환, 햄버거 메뉴 사용, 섹션 sticky 해제 |

```css
/* Tablet */
@media (min-width: 769px) and (max-width: 1024px) {
  /* tablet styles */
}

/* Mobile */
@media (min-width: 390px) and (max-width: 768px) {
  /* mobile styles */
}
```

---

## 2. 공통 디자인 토큰

다른 페이지에도 먼저 페이지 스코프 클래스를 잡고, 그 안에서 폰트/여백 변수를 재정의하면 됩니다.

예시:

```css
/* 예: location.html이면 .location-page */
.location-page {
  --container-w: min(100% - 80px, 1180px);
  --fs-sec-en: clamp(40px, 4vw, 56px);
  --fs-sec-serif: clamp(48px, 5vw, 68px);
  --fs-caption: 18px;
  --fs-sub: 16px;
  --sec-gap: 40px;
  --card-gap: 20px;
}
```

---

## 3. Tablet 적용 기준

### 3-1. Tablet 토큰

```css
@media (min-width: 769px) and (max-width: 1024px) {
  .페이지클래스 {
    --container-w: min(100% - 64px, 960px);

    --fs-hero: clamp(76px, 9vw, 104px);
    --fs-eyebrow: clamp(22px, 2.8vw, 28px);
    --fs-hero-sub: clamp(20px, 2.5vw, 24px);

    --fs-sec-en: clamp(34px, 4.1vw, 40px);
    --fs-sec-serif: clamp(38px, 4.7vw, 46px);
    --fs-creature: clamp(36px, 4.2vw, 44px);

    --fs-nav: clamp(15px, 1.7vw, 17px);
    --fs-nav-active: clamp(18px, 2vw, 20px);
    --fs-caption: 17px;
    --fs-sub: 16px;

    --sec-gap: 34px;
    --card-gap: 14px;
  }
}
```

### 3-2. Tablet 폰트 사이즈

| 요소 | 적용값 |
|---|---:|
| Hero Title | `clamp(76px, 9vw, 104px)` |
| Eyebrow | `clamp(22px, 2.8vw, 28px)` |
| Hero Sub | `clamp(20px, 2.5vw, 24px)` |
| Section 영문 타이틀 | `clamp(34px, 4.1vw, 40px)` |
| Section Serif 타이틀 | `clamp(38px, 4.7vw, 46px)` |
| 생물/대표 오브젝트 이름 | `clamp(36px, 4.2vw, 44px)` |
| GNB 메뉴 | `clamp(15px, 1.7vw, 17px)` |
| 카드 제목 | `17px` |
| 서브텍스트 | `16px` |

### 3-3. Tablet 여백/레이아웃

```css
@media (min-width: 769px) and (max-width: 1024px) {
  .페이지클래스 .container {
    width: var(--container-w);
  }

  .페이지클래스 .gnb {
    padding: 20px 24px;
  }

  .페이지클래스 .gnb__nav {
    gap: clamp(14px, 2vw, 28px);
  }

  .페이지클래스 .section-title__sub {
    font-size: 16px;
  }
}
```

| 요소 | 적용값 |
|---|---:|
| Container | `min(100% - 64px, 960px)` |
| GNB padding | `20px 24px` |
| GNB nav gap | `clamp(14px, 2vw, 28px)` |
| 섹션 타이틀 간격 | `34px` |
| 카드 간격 | `14px` |
| Hero 좌우 여백 | `40px` |

### 3-4. Tablet 카드/그리드 기준

태블릿에서는 카드가 너무 길어지지 않도록 **2열 grid**를 유지하고, 카드 높이만 줄입니다.

```css
@media (min-width: 769px) and (max-width: 1024px) {
  .페이지클래스 .card-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    width: min(100% - 72px, 900px);
    margin-inline: auto;
    gap: 14px;
  }

  .페이지클래스 .card {
    width: 100% !important;
    height: clamp(292px, 33vw, 348px);
    border-radius: 18px;
  }

  .페이지클래스 .card__body {
    padding: 20px;
  }

  .페이지클래스 .card__title {
    font-size: 17px;
    line-height: 1.35;
  }

  .페이지클래스 .card__desc {
    font-size: 11px;
    line-height: 1.55;
  }
}
```

---

## 4. Mobile 적용 기준

### 4-1. Mobile 토큰

```css
@media (min-width: 390px) and (max-width: 768px) {
  .페이지클래스 {
    --fs-hero: clamp(46px, 12.5vw, 72px);
    --fs-eyebrow: clamp(17px, 4.8vw, 23px);
    --fs-hero-sub: clamp(14px, 4vw, 19px);

    --fs-sec-en: clamp(26px, 7vw, 36px);
    --fs-sec-serif: clamp(30px, 8vw, 40px);
    --fs-creature: clamp(26px, 7vw, 36px);

    --fs-caption: 15px;
    --fs-sub: 13px;

    --sec-gap: 24px;
    --card-gap: 10px;
  }
}
```

### 4-2. Mobile 폰트 사이즈

| 요소 | 적용값 |
|---|---:|
| Hero Title | `clamp(46px, 12.5vw, 72px)` |
| Eyebrow | `clamp(17px, 4.8vw, 23px)` |
| Hero Sub | `clamp(14px, 4vw, 19px)` |
| Section 영문 타이틀 | `clamp(26px, 7vw, 36px)` |
| Section Serif 타이틀 | `clamp(30px, 8vw, 40px)` |
| 생물/대표 오브젝트 이름 | `clamp(26px, 7vw, 36px)` |
| 카드 제목 | `15px` 기준, 작은 카드는 `13px ~ 14px` |
| 서브텍스트 | `13px` |
| 모바일 메뉴 | `clamp(24px, 7vw, 32px)` |
| 모바일 서브메뉴 | `17px` |

### 4-3. Mobile 여백/헤더

```css
@media (min-width: 390px) and (max-width: 768px) {
  .페이지클래스 .gnb {
    padding: 14px 20px;
  }

  .페이지클래스 .gnb__inner {
    height: 44px;
  }

  .페이지클래스 .gnb__nav,
  .페이지클래스 .gnb__ticket {
    display: none;
  }

  .페이지클래스 .gnb__hamburger {
    display: flex;
  }
}
```

| 요소 | 적용값 |
|---|---:|
| GNB padding | `14px 20px` |
| GNB height | `44px` |
| 모바일 메뉴 좌우 여백 | `32px` |
| 모바일 티켓 버튼 위 여백 | `28px` |
| Hero 좌우 여백 | `24px` |
| 섹션 타이틀 간격 | `24px` |
| 카드 간격 | `10px` |

### 4-4. Mobile 섹션 구조

모바일에서는 PC/태블릿에서 쓰던 sticky 기반 레이아웃을 풀고, 일반 문서 흐름으로 내려오게 정리합니다.

```css
@media (min-width: 390px) and (max-width: 768px) {
  .페이지클래스 .section {
    height: auto;
    min-height: unset;
    padding: 76px 0;
    overflow: visible;
  }

  .페이지클래스 .section-seq-sticky {
    position: static !important;
    height: auto !important;
    overflow: visible !important;
    padding-top: 0 !important;
    display: block !important;
  }

  .페이지클래스 .seq-title,
  .페이지클래스 .seq-content {
    opacity: 1 !important;
    transform: none !important;
    pointer-events: auto !important;
    transition: none !important;
  }
}
```

### 4-5. Mobile 카드/그리드 기준

모바일은 **1열 grid**로 바꾸고, 카드 폭은 `400px` 안에서 화면 폭에 맞게 줄입니다.

```css
@media (min-width: 390px) and (max-width: 768px) {
  .페이지클래스 .card-grid {
    display: grid !important;
    grid-template-columns: 1fr !important;
    width: min(100% - 56px, 400px) !important;
    max-width: 400px !important;
    margin-inline: auto !important;
    gap: 10px !important;
    padding: 10px;
    border-radius: 14px;
  }

  .페이지클래스 .card {
    width: 100% !important;
    max-width: 100% !important;
    height: clamp(190px, 48vw, 250px) !important;
    border-radius: 10px;
    overflow: hidden !important;
  }

  .페이지클래스 .card__body {
    padding: 14px;
  }

  .페이지클래스 .card__title {
    font-size: 14px;
    line-height: 1.35;
  }

  .페이지클래스 .card__desc {
    font-size: 10px;
    line-height: 1.55;
  }
}
```

---

## 5. 페이지별 적용 방법

### 5-1. HTML body에 페이지 클래스 추가

각 페이지마다 body에 페이지별 클래스를 넣어야 스타일 충돌을 막을 수 있습니다.

```html
<body class="location-page has-custom-cursor">
```

예시:

| 페이지 | 추천 body 클래스 |
|---|---|
| 메인 | `index-page` |
| Location | `location-page` |
| Program | `program-page` |
| Ocean friends | `ocean-page` |
| Business | `business-page` |
| Marin Lab | `marinlab-page` |
| Ticket | `ticket-page` |

### 5-2. CSS의 `.페이지클래스`를 실제 클래스명으로 변경

예를 들어 `program.html`에 적용하려면 아래처럼 바꿉니다.

```css
@media (min-width: 390px) and (max-width: 768px) {
  .program-page .card-grid {
    grid-template-columns: 1fr;
  }
}
```

---

## 6. 적용 규칙 요약

### Tablet

- PC 레이아웃을 크게 무너뜨리지 않고 축소한다.
- 2열 레이아웃은 유지한다.
- 컨테이너는 `min(100% - 64px, 960px)` 기준으로 줄인다.
- 카드 gap은 `14px`로 맞춘다.
- 섹션 타이틀은 `34px ~ 46px` 사이에서 유동 조정한다.

### Mobile

- 모든 주요 카드/콘텐츠는 1열로 전환한다.
- sticky 기반 섹션은 `position: static`으로 풀어준다.
- PC용 GNB는 숨기고 햄버거 메뉴를 사용한다.
- 컨텐츠 폭은 `min(100% - 56px, 400px)` 기준을 사용한다.
- 카드 gap은 `10px`로 통일한다.
- 섹션 상하 여백은 `76px 0`을 기본으로 맞춘다.
- 너무 무거운 배경 영상/효과는 모바일에서 숨기는 것이 안전하다.

---

## 7. 복붙용 기본 템플릿

```css
/* =============================================================
   PAGE RESPONSIVE GUIDE
   PC: 1025px 이상
   TABLET: 769px ~ 1024px
   MOBILE: 390px ~ 768px
   ============================================================= */

@media (min-width: 769px) and (max-width: 1024px) {
  .페이지클래스 {
    --container-w: min(100% - 64px, 960px);
    --fs-sec-en: clamp(34px, 4.1vw, 40px);
    --fs-sec-serif: clamp(38px, 4.7vw, 46px);
    --fs-caption: 17px;
    --fs-sub: 16px;
    --sec-gap: 34px;
    --card-gap: 14px;
  }

  .페이지클래스 .container {
    width: var(--container-w);
  }

  .페이지클래스 .card-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    width: min(100% - 72px, 900px);
    margin-inline: auto;
    gap: var(--card-gap);
  }

  .페이지클래스 .card {
    width: 100% !important;
    height: clamp(292px, 33vw, 348px);
  }
}

@media (min-width: 390px) and (max-width: 768px) {
  .페이지클래스 {
    --fs-sec-en: clamp(26px, 7vw, 36px);
    --fs-sec-serif: clamp(30px, 8vw, 40px);
    --fs-caption: 15px;
    --fs-sub: 13px;
    --sec-gap: 24px;
    --card-gap: 10px;
  }

  .페이지클래스 .section {
    height: auto;
    min-height: unset;
    padding: 76px 0;
    overflow: visible;
  }

  .페이지클래스 .section-seq-sticky {
    position: static !important;
    height: auto !important;
    overflow: visible !important;
    padding-top: 0 !important;
    display: block !important;
  }

  .페이지클래스 .card-grid {
    display: grid !important;
    grid-template-columns: 1fr !important;
    width: min(100% - 56px, 400px) !important;
    max-width: 400px !important;
    margin-inline: auto !important;
    gap: var(--card-gap) !important;
    padding: 10px;
  }

  .페이지클래스 .card {
    width: 100% !important;
    max-width: 100% !important;
    height: clamp(190px, 48vw, 250px) !important;
    overflow: hidden !important;
  }
}
```

---

## 8. 팀원에게 설명할 때 한 줄 정리

태블릿은 기존 PC 구조를 유지하면서 폰트와 여백만 줄였고, 모바일은 1열 구조로 바꾸면서 sticky 섹션을 해제해 일반 스크롤 흐름으로 정리했습니다. 카드 간격은 태블릿 `14px`, 모바일 `10px`로 통일했고, 섹션 상하 여백은 모바일 기준 `76px`로 맞췄습니다.
