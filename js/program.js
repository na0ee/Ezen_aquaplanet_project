document.addEventListener('DOMContentLoaded', function() {
  const LOCATIONS = ['Jeju', 'Yeosu', 'Ilsan', 'Gwanggyo'];

  // ===== 페이지 10% 이상 스크롤 시 GNB 색상 전환 (흰색 → primary 계열) =====
  const gnb = document.querySelector('.gnb');
  if (gnb) {
    const ticketIcon = gnb.querySelector('.btn--ticket .btn__icon img');
    const ticketIconWhite = '../assets/images/ticket_icon_white.svg';
    const ticketIconBlue = '../assets/images/ticket_icon_blue.svg';

    const logoImg = gnb.querySelector('.gnb__logo img');
    const logoWhite = '../assets/images/headerLogo.png';
    const logoBlue = '../assets/images/headerLogo_blue.png';

    let lastScrollY = window.scrollY;

    function updateGnbScrolled() {
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? y / max : 0;
      const scrolled = progress >= 0.1;

      gnb.classList.toggle('gnb--scrolled', scrolled);
      // 티켓 아이콘도 스크롤 상태에 맞춰 흰색/파란색 전환
      if (ticketIcon) ticketIcon.src = scrolled ? ticketIconBlue : ticketIconWhite;
      // 로고도 스크롤 상태에 맞춰 전환
      if (logoImg) logoImg.src = scrolled ? logoBlue : logoWhite;

      // 10% 넘은 뒤: 아래로 스크롤하면 숨기고, 위로 스크롤하면 다시 표시
      if (scrolled && y > lastScrollY) {
        gnb.classList.add('gnb--hidden');
      } else {
        gnb.classList.remove('gnb--hidden');
      }
      lastScrollY = y;
    }
    window.addEventListener('scroll', updateGnbScrolled);
    window.addEventListener('resize', updateGnbScrolled);
    updateGnbScrolled();
  }

  // 각 지역의 일정표(.schedule-table)를 독립적으로 초기화한다.
  // (querySelector 단일 요소가 아니라 테이블별 스코프로 동작 → 지역 전환해도 기능/모션 유지)
  document.querySelectorAll('.schedule-table').forEach(initScheduleTable);

  // ============================================================
  // 새 카드형 시간블록 레이아웃 초기화 (date tabs + time-block accordion)
  // ============================================================
  function initTimeBlockTable(table) {
    // Date tab switching (UI only — 실제 날짜별 데이터 전환은 서버 연동 시 확장)
    table.querySelectorAll('.schedule-date-tab').forEach(tab => {
      tab.addEventListener('click', function() {
        table.querySelectorAll('.schedule-date-tab').forEach(t => t.classList.remove('schedule-date-tab--active'));
        this.classList.add('schedule-date-tab--active');
      });
    });

  }

  // ============================================================
  // 일정표 1개 초기화 (시간탭 / 슬롯정렬 / 스크롤동기화 / 커스텀 스크롤바 / 라벨높이)
  // table._relayout() 으로 (숨김→표시 전환 시) 레이아웃 재계산 가능
  // ============================================================
  function initScheduleTable(table) {
    // 새 카드형 레이아웃이면 전용 초기화로 분기
    if (table.querySelector('.schedule-date-tabs')) {
      initTimeBlockTable(table);
      return;
    }
    const fullRow = table.querySelector('.schedule-hours-row--full');
    const halfRow = table.querySelector('.schedule-hours-row--half');
    if (!fullRow || !halfRow) return;

    const programsList = table.querySelectorAll('.schedule-section__programs');
    const contentsEl = table.querySelector('.schedule-section__contents');
    const hourButtons = fullRow.querySelectorAll('.schedule-hour');

    let isScrolling = false;
    let currentHour = null;

    // ----- 선택된 시간대 프로그램 하이라이트 -----
    function highlightProgramsByTime(selectedHour) {
      const greyIcon = '../assets/images/time_icon_grey.svg';
      const whiteIcon = '../assets/images/time_icon_white.svg';

      // 이 테이블의 모든 program-slot 하이라이트 제거 + 아이콘 grey 복원
      table.querySelectorAll('.program-slot').forEach(slot => {
        slot.classList.remove('program-slot--active');
        const icon = slot.querySelector('.program-time__icon img');
        if (icon) icon.src = greyIcon;
      });

      // 선택 시간대 프로그램만 배경/아이콘 변경
      programsList.forEach(programsContainer => {
        programsContainer.querySelectorAll('.program-slot').forEach(slot => {
          const timeEl = slot.querySelector('.program-time');
          if (!timeEl) return;
          const startTime = parseInt(timeEl.textContent.trim().split(':')[0]);
          if (startTime === selectedHour) {
            slot.classList.add('program-slot--active');
            const icon = slot.querySelector('.program-time__icon img');
            if (icon) icon.src = whiteIcon;
          }
        });
      });
    }

    // ----- 스크롤 동기화 -----
    function syncScrolls(selectedHour) {
      const targetHour = halfRow.querySelector(`[data-hour="${String(selectedHour).padStart(2, '0')}"]`);

      if (targetHour) {
        const targetIndex = selectedHour - 9;

        // 처음 두 시간(09:00, 10:00)은 스크롤하지 않음
        if (targetIndex < 2) {
          halfRow.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          // 11시부터는 active의 left가 6번째 .schedule-hour의 right에 오도록 스크롤
          const fullHours = fullRow.querySelectorAll('.schedule-hour');
          const anchor = fullHours[5];
          const anchorRight = anchor.getBoundingClientRect().right;

          // 19시는 18시 위치를 그대로 유지
          const alignHour = selectedHour === 19 ? 18 : selectedHour;
          const alignTarget = halfRow.querySelector(`[data-hour="${String(alignHour).padStart(2, '0')}"]`);
          const targetLeft = alignTarget.getBoundingClientRect().left;

          const scrollValue = halfRow.scrollLeft + (targetLeft - anchorRight) + 5;
          halfRow.scrollTo({ left: Math.max(0, scrollValue), behavior: 'smooth' });
        }
      }

      // .schedule-section__programs 가로 스크롤 (선택 시간대 첫 슬롯을 중앙으로)
      programsList.forEach(programsContainer => {
        const slots = programsContainer.querySelectorAll('.program-slot');
        let firstMatchingSlot = null;
        slots.forEach(slot => {
          if (firstMatchingSlot) return;
          const timeEl = slot.querySelector('.program-time');
          if (!timeEl) return;
          const startTime = parseInt(timeEl.textContent.trim().split(':')[0]);
          if (startTime === selectedHour) firstMatchingSlot = slot;
        });

        if (firstMatchingSlot) {
          const containerWidth = programsContainer.clientWidth;
          const slotLeft = firstMatchingSlot.offsetLeft;
          const slotWidth = firstMatchingSlot.offsetWidth;
          programsContainer.scrollTo({ left: slotLeft - (containerWidth / 2) + (slotWidth / 2), behavior: 'smooth' });
        }
      });
    }

    // ----- 프로그램들을 시간에 맞게 정렬 -----
    function alignProgramsByTime() {
      const hourElements = halfRow.querySelectorAll('.schedule-hour');
      if (hourElements.length < 2) return;

      const pixelPerHour = hourElements[1].offsetLeft - hourElements[0].offsetLeft;
      if (!pixelPerHour) return; // 숨김 상태 등으로 계산 불가하면 중단

      const allGroups = [];
      const allRights = [];

      programsList.forEach(programsContainer => {
        programsContainer.querySelectorAll('.program-group').forEach(group => {
          const slots = group.querySelectorAll('.program-slot');

          group.style.gap = '0';
          group.style.width = '';

          let prevRightEdge = 0;
          slots.forEach(slot => {
            const timeText = slot.querySelector('.program-time').textContent.trim();
            const [startTimeStr, endTimeStr] = timeText.split(' - ').map(t => t.trim());
            const [startHour, startMin] = startTimeStr.split(':').map(Number);
            const [endHour, endMin] = (endTimeStr || '').split(':').map(Number);

            const startPos = (startHour - 9 + startMin / 60) * pixelPerHour;

            let durationHours = (endHour + endMin / 60) - (startHour + startMin / 60);
            if (durationHours < 0) durationHours += 24;
            const durationWidth = durationHours * pixelPerHour;

            slot.style.width = '';
            if (Number.isFinite(durationWidth) && durationWidth > slot.offsetWidth) {
              slot.style.width = durationWidth + 'px';
            }

            slot.style.marginLeft = (startPos - prevRightEdge) + 'px';
            prevRightEdge = startPos + slot.offsetWidth;
          });

          allGroups.push(group);
          allRights.push(prevRightEdge);
        });
      });

      const maxRight = allRights.length ? Math.max(...allRights) : 0;
      allGroups.forEach(group => { group.style.width = maxRight + 'px'; });
    }

    // ----- half row 끝 여백 (마지막 시간까지 정렬되도록) -----
    function adjustHalfRowEndPadding() {
      const fullHours = fullRow.querySelectorAll('.schedule-hour');
      if (fullHours.length < 6) return;
      const halfLeft = halfRow.getBoundingClientRect().left;
      const anchorRight = fullHours[5].getBoundingClientRect().right - halfLeft;
      const padding = halfRow.clientWidth - anchorRight;
      halfRow.style.paddingRight = Math.max(0, padding) + 'px';
    }

    // ----- 라벨 높이를 프로그램 영역 마지막 줄에 맞춤 -----
    function syncLabelHeights() {
      const labels = table.querySelectorAll('.schedule-section__label');
      programsList.forEach((programs, index) => {
        const label = labels[index];
        if (!label) return;
        const groups = programs.querySelectorAll('.program-group');
        const target = groups.length === 0 ? programs : groups[groups.length - 1];
        const targetBottom = target.getBoundingClientRect().bottom;
        const labelTop = label.getBoundingClientRect().top;
        label.style.height = (targetBottom - labelTop) + 'px';
      });
    }

    // ----- 커스텀 가로 스크롤바 -----
    const cscrollbar = table.querySelector('.cscrollbar');
    const cthumb = cscrollbar ? cscrollbar.querySelector('.cscrollbar__thumb') : null;
    const cprogress = cscrollbar ? cscrollbar.querySelector('.cscrollbar__progress') : null;

    function updateCustomScrollbar() {
      if (!contentsEl || !cscrollbar || !cthumb || !cprogress) return;
      const maxScroll = contentsEl.scrollWidth - contentsEl.clientWidth;
      if (maxScroll <= 0) {
        cscrollbar.style.visibility = 'hidden';
        return;
      }
      cscrollbar.style.visibility = '';
      const trackWidth = cscrollbar.clientWidth - cthumb.offsetWidth;
      const thumbLeft = (contentsEl.scrollLeft / maxScroll) * trackWidth;
      cthumb.style.left = thumbLeft + 'px';
      cprogress.style.width = (thumbLeft + cthumb.offsetWidth / 2) + 'px';
    }

    if (contentsEl && cscrollbar && cthumb && cprogress) {
      contentsEl.addEventListener('scroll', function() {
        updateCustomScrollbar();
        if (isScrolling) return;
        isScrolling = true;
        halfRow.scrollLeft = contentsEl.scrollLeft;
        fullRow.scrollLeft = contentsEl.scrollLeft;
        requestAnimationFrame(() => { isScrolling = false; });
      });

      // 손잡이 드래그
      let dragging = false, dragStartX = 0, dragStartScroll = 0;
      cthumb.addEventListener('pointerdown', function(e) {
        dragging = true;
        dragStartX = e.clientX;
        dragStartScroll = contentsEl.scrollLeft;
        cthumb.setPointerCapture(e.pointerId);
        e.preventDefault();
      });
      cthumb.addEventListener('pointermove', function(e) {
        if (!dragging) return;
        const maxScroll = contentsEl.scrollWidth - contentsEl.clientWidth;
        const trackWidth = cscrollbar.clientWidth - cthumb.offsetWidth;
        if (trackWidth <= 0) return;
        const deltaX = e.clientX - dragStartX;
        contentsEl.scrollLeft = dragStartScroll + (deltaX / trackWidth) * maxScroll;
      });
      function endDrag(e) {
        if (!dragging) return;
        dragging = false;
        try { cthumb.releasePointerCapture(e.pointerId); } catch (err) { /* noop */ }
      }
      cthumb.addEventListener('pointerup', endDrag);
      cthumb.addEventListener('pointercancel', endDrag);

      // 트랙 클릭 이동
      cscrollbar.addEventListener('pointerdown', function(e) {
        if (e.target === cthumb) return;
        const trackWidth = cscrollbar.clientWidth - cthumb.offsetWidth;
        if (trackWidth <= 0) return;
        const clickX = e.clientX - cscrollbar.getBoundingClientRect().left - cthumb.offsetWidth / 2;
        const ratio = Math.max(0, Math.min(1, clickX / trackWidth));
        contentsEl.scrollLeft = ratio * (contentsEl.scrollWidth - contentsEl.clientWidth);
      });

      if (contentsEl) new ResizeObserver(updateCustomScrollbar).observe(contentsEl);
    }

    // ----- 시간 탭 클릭 -----
    function setActiveHour(hour) {
      currentHour = hour;
      hourButtons.forEach(b => b.classList.remove('schedule-hour--active'));
      halfRow.querySelectorAll('.schedule-hour').forEach(h => h.classList.remove('schedule-hour--active'));

      const fullTarget = [...hourButtons].find(b => parseInt(b.textContent.trim().split(':')[0]) === hour);
      if (fullTarget) fullTarget.classList.add('schedule-hour--active');
      const halfTarget = halfRow.querySelector(`[data-hour="${String(hour).padStart(2, '0')}"]`);
      if (halfTarget) halfTarget.classList.add('schedule-hour--active');

      highlightProgramsByTime(hour);
      syncScrolls(hour);
    }

    hourButtons.forEach(button => {
      button.addEventListener('click', function() {
        setActiveHour(parseInt(button.textContent.trim().split(':')[0]));
      });
    });

    // 슬롯 호버 시 시간 아이콘을 흰색으로 (active처럼). 떼면 active가 아닐 때만 grey로 복원
    const greyIcon = '../assets/images/time_icon_grey.svg';
    const whiteIcon = '../assets/images/time_icon_white.svg';
    table.querySelectorAll('.program-slot').forEach(slot => {
      const icon = slot.querySelector('.program-time__icon img');
      if (!icon) return;
      slot.addEventListener('mouseenter', function() { icon.src = whiteIcon; });
      slot.addEventListener('mouseleave', function() {
        if (!slot.classList.contains('program-slot--active')) icon.src = greyIcon;
      });
    });

    // 좌우 스크롤 동기화 (full ↔ half ↔ contents)
    fullRow.addEventListener('scroll', function() {
      if (isScrolling) return;
      isScrolling = true;
      halfRow.scrollLeft = fullRow.scrollLeft;
      if (contentsEl) contentsEl.scrollLeft = fullRow.scrollLeft;
      requestAnimationFrame(() => { isScrolling = false; });
    });
    halfRow.addEventListener('scroll', function() {
      if (isScrolling) return;
      isScrolling = true;
      fullRow.scrollLeft = halfRow.scrollLeft;
      if (contentsEl) contentsEl.scrollLeft = halfRow.scrollLeft;
      requestAnimationFrame(() => { isScrolling = false; });
    });

    // 프로그램 영역 크기 변경 시 라벨 높이 재동기화
    const labelHeightObserver = new ResizeObserver(syncLabelHeights);
    programsList.forEach(programs => labelHeightObserver.observe(programs));

    // (숨김→표시 전환, 리사이즈 시) 레이아웃 전체 재계산
    function relayout() {
      alignProgramsByTime();
      adjustHalfRowEndPadding();
      syncLabelHeights();
      updateCustomScrollbar();
      if (currentHour != null) {
        highlightProgramsByTime(currentHour);
        syncScrolls(currentHour);
      }
    }
    table._relayout = relayout;

    // 초기 상태: 첫 시간대 활성화
    if (hourButtons.length > 0) {
      setTimeout(() => {
        alignProgramsByTime();
        adjustHalfRowEndPadding();
        setActiveHour(parseInt(hourButtons[0].textContent.trim().split(':')[0]));
        updateCustomScrollbar();
      }, 100);
    }
  }

  // ============================================================
  // 지역 탭(cartegory-tabs-a) / GNB 드롭다운 → 해당 지역 섹션만 표시
  // .cartegory-tabs-a 와 .schedule-toggle 은 항상 고정, 섹션만 교체
  // ============================================================
  const locationTabs = document.querySelectorAll('.cartegory-tabs-a__item');
  const gnbLocationItems = document.querySelectorAll('.gnb__dropdown-item[data-location]');

  function selectLocation(loc) {
    LOCATIONS.forEach(name => {
      const hidden = name !== loc;
      document
        .querySelectorAll('.section--schedule.' + name + ', .section--guide.' + name)
        .forEach(sec => sec.classList.toggle('is-hidden', hidden));
    });

    locationTabs.forEach(t =>
      t.classList.toggle('cartegory-tabs-a__item--active', t.textContent.trim() === loc));
    gnbLocationItems.forEach(it =>
      it.classList.toggle('gnb__dropdown-item--active', it.dataset.location === loc));

    // 새로 보이게 된 지역의 일정표 레이아웃 재계산 (숨김 상태에서 0으로 계산됐던 것 보정)
    const visibleSchedule = document.querySelector('.section--schedule.' + loc);
    if (visibleSchedule) {
      const table = visibleSchedule.querySelector('.schedule-table');
      if (table && typeof table._relayout === 'function') {
        requestAnimationFrame(() => requestAnimationFrame(table._relayout));
      }
    }
  }

  locationTabs.forEach(tab => {
    tab.addEventListener('click', function() {
      selectLocation(tab.textContent.trim());
    });
  });
  gnbLocationItems.forEach(item => {
    item.addEventListener('click', function(e) {
      e.preventDefault();
      selectLocation(item.dataset.location);
    });
  });

  if (locationTabs.length) {
    // URL 파라미터(?loc=Yeosu 등)가 있으면 해당 지역으로 진입 (다른 페이지 GNB 드롭다운에서 연결)
    const locParam = new URLSearchParams(window.location.search).get('loc');
    const fromUrl = LOCATIONS.find(l => l.toLowerCase() === (locParam || '').toLowerCase());
    if (fromUrl) {
      selectLocation(fromUrl);
    } else {
      const activeTab = document.querySelector('.cartegory-tabs-a__item--active') || locationTabs[0];
      selectLocation(activeTab.textContent.trim());
    }
  }

  // 리사이즈 시 보이는 일정표만 재계산
  window.addEventListener('resize', function() {
    document.querySelectorAll('.section--schedule:not(.is-hidden) .schedule-table').forEach(table => {
      if (typeof table._relayout === 'function') table._relayout();
    });
  });

  // ============================================================
  // 프로그램 일정/안내 토글 (화면 우측 중앙 고정, 모든 지역 공용 1개)
  // 현재 보이는 지역의 schedule/guide 섹션을 대상으로 동작
  // ============================================================
  const scheduleToggle = document.querySelector('.schedule-toggle');
  if (scheduleToggle) {
    const toggleItems = scheduleToggle.querySelectorAll('.schedule-toggle__item');
    const visibleSection = type =>
      document.querySelector('.section--' + type + ':not(.is-hidden)');

    toggleItems.forEach(item => {
      item.addEventListener('click', function() {
        const type = item.dataset.section === 'guide' ? 'guide' : 'schedule';
        const target = visibleSection(type);
        if (target) target.scrollIntoView({ behavior: 'smooth' });
      });
    });

    function updateToggleActive() {
      const guide = visibleSection('guide');
      if (!guide) return;
      const isGuide = guide.getBoundingClientRect().top <= window.innerHeight / 2;
      toggleItems.forEach(item => {
        const active = (item.dataset.section === 'guide') === isGuide;
        item.classList.toggle('schedule-toggle__item--active', active);
      });
    }

    window.addEventListener('scroll', updateToggleActive);
    updateToggleActive();
  }

  // ============================================================
  // program-card 클릭 시 상세 인라인 펼침 (아코디언) — 모달은 페이지에 1개(공용)
  // ============================================================
  const detailModal = document.querySelector('.detail-modal');
  let openDetail = null, smoothScrollTo = null;

  if (detailModal) {
    const modalTag = detailModal.querySelector('.detail-modal__tag');
    const modalTitle = detailModal.querySelector('.detail-modal__title');
    const modalParts = detailModal.querySelector('.detail-modal__parts');
    let activeCard = null;

    function fillDetail(card) {
      const tag = card.querySelector('.tag');
      if (tag && modalTag) {
        modalTag.textContent = tag.textContent;
        const variant = [...tag.classList].find(c => c.startsWith('tag--')) || '';
        modalTag.className = 'tag detail-modal__tag ' + variant;
      }
      const title = card.querySelector('.program-card__title');
      if (title && modalTitle) modalTitle.textContent = title.textContent;

      const detail = card.querySelector('.program-card__detail');
      if (modalParts) {
        if (detail) {
          const clone = detail.cloneNode(true);
          clone.querySelectorAll('.program-card__detail-img').forEach(img => img.remove());
          modalParts.innerHTML = clone.innerHTML;
        } else {
          modalParts.innerHTML = '';
        }
      }

      const modalImageImg = detailModal.querySelector('.detail-modal__image img');
      const detailImg = detail ? detail.querySelector('.program-card__detail-img') : null;
      const detailImgSrc = detailImg ? detailImg.getAttribute('src') : '';
      if (modalImageImg && detailImgSrc) {
        modalImageImg.src = detailImgSrc;
        modalImageImg.alt = detailImg.getAttribute('alt') || '';
      }
      if (modalImageImg) {
        modalImageImg.style.transform = detailImg ? detailImg.style.transform : '';
      }
    }

    function closeDetail() {
      detailModal.classList.remove('is-open');
      if (activeCard) {
        activeCard.classList.remove('program-card--active');
        activeCard = null;
      }
    }

    openDetail = function(card) {
      if (activeCard === card) { closeDetail(); return; }
      closeDetail();
      fillDetail(card);
      card.after(detailModal);
      card.classList.add('program-card--active');
      activeCard = card;
      requestAnimationFrame(() => detailModal.classList.add('is-open'));
    };

    document.querySelectorAll('.program-card').forEach(card => {
      card.addEventListener('click', function() { openDetail(card); });
    });
    detailModal.addEventListener('click', closeDetail);

    // 속도 조절 가능한 부드러운 스크롤
    smoothScrollTo = function(targetY, duration) {
      const startY = window.scrollY;
      const diff = targetY - startY;
      let startTime = null;
      function step(now) {
        if (startTime === null) startTime = now;
        const t = Math.min((now - startTime) / duration, 1);
        const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        window.scrollTo(0, startY + diff * ease);
        if (t < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    };
  }

  // ============================================================
  // program-slot 클릭 → 같은 지역 가이드의 해당 card로 스크롤 + 상세 열기
  // (지역별로 스코프 → 같은 프로그램명이 여러 지역에 있어도 올바른 카드 연결)
  // ============================================================
  document.querySelectorAll('.section--schedule').forEach(scheduleSection => {
    const loc = LOCATIONS.find(l => scheduleSection.classList.contains(l));
    const guideSection = document.querySelector('.section--guide' + (loc ? '.' + loc : ''));
    if (!guideSection) return;
    const cards = [...guideSection.querySelectorAll('.program-card')];

    // 슬롯 내용(카테고리 태그 + 프로그램명)을 카드 데이터에서 주입한다.
    // 카드가 "원본 데이터"가 되고, 슬롯에는 data-program 키와 시간(.program-time)만 두면 됨.
    function syncSlotFromCard(slot, card) {
      const timeEl = slot.querySelector('.program-time'); // 시간은 슬롯 고유값이라 유지

      // 1) 카테고리 태그: 카드의 .tag(클래스+텍스트)를 슬롯에 복제/갱신
      const cardTag = card.querySelector('.tag');
      if (cardTag) {
        let slotTag = slot.querySelector('.tag');
        if (!slotTag) {
          slotTag = document.createElement('span');
          slot.insertBefore(slotTag, slot.firstChild);
        }
        slotTag.className = cardTag.className; // tag tag--education 등 그대로
        slotTag.textContent = cardTag.textContent;
      }

      // 2) 프로그램명: 카드 제목에서 가져오기
      const cardTitle = card.querySelector('.program-card__title');
      if (cardTitle) {
        let nameEl = slot.querySelector('.program-name');
        if (!nameEl) {
          nameEl = document.createElement('div');
          nameEl.className = 'program-name';
          // 태그 다음, 시간 앞에 배치
          if (timeEl) slot.insertBefore(nameEl, timeEl);
          else slot.appendChild(nameEl);
        }
        nameEl.textContent = cardTitle.textContent.trim();
      }
    }

    scheduleSection.querySelectorAll('.program-slot').forEach(slot => {
      // (A) 슬롯에 data-program이 지정돼 있으면 → 카드에서 데이터 주입
      if (slot.dataset.program) {
        const card = guideSection.querySelector('.program-card[data-program="' + slot.dataset.program + '"]');
        if (card) syncSlotFromCard(slot, card);
      } else {
        // (B) 레거시: 프로그램명 텍스트로 카드를 찾아 data-program만 연결 (기존 호환)
        const nameEl = slot.querySelector('.program-name');
        if (nameEl) {
          const match = cards.find(c => {
            const t = c.querySelector('.program-card__title');
            return t && t.textContent.trim() === nameEl.textContent.trim();
          });
          if (match && match.dataset.program) slot.dataset.program = match.dataset.program;
        }
      }

      slot.addEventListener('click', function() {
        const key = slot.dataset.program;
        if (!key) return;
        const card = guideSection.querySelector('.program-card[data-program="' + key + '"]');
        if (!card || !openDetail) return;
        openDetail(card);
        if (smoothScrollTo) {
          requestAnimationFrame(() => {
            const top = card.getBoundingClientRect().top + window.scrollY - 140;
            smoothScrollTo(top, 900);
          });
        }
      });
    });

    // 새 카드형 레이아웃 .time-block__item → 같은 지역 가이드 카드 연결
    scheduleSection.querySelectorAll('.time-block__item[data-program]').forEach(item => {
      item.addEventListener('click', function() {
        const key = item.dataset.program;
        if (!key) return;
        const card = guideSection.querySelector('.program-card[data-program="' + key + '"]');
        if (!card || !openDetail) return;
        openDetail(card);
        if (smoothScrollTo) {
          requestAnimationFrame(() => {
            const top = card.getBoundingClientRect().top + window.scrollY - 140;
            smoothScrollTo(top, 900);
          });
        }
      });
    });
  });

  // ============================================================
  // 카테고리 탭(cartegory-tabs-b)으로 program-card 필터링 (가이드 섹션마다)
  // ============================================================
  const categoryFilters = [null, 'tag--education', 'tag--performance', 'tag--experience'];
  document.querySelectorAll('.section--guide').forEach(guideSection => {
    const categoryTabs = guideSection.querySelectorAll('.cartegory-tabs-b__item');
    const programCards = guideSection.querySelectorAll('.program-card');

    categoryTabs.forEach((tab, index) => {
      tab.addEventListener('click', function() {
        categoryTabs.forEach(t => t.classList.remove('cartegory-tabs-b__item--active'));
        tab.classList.add('cartegory-tabs-b__item--active');

        const filter = categoryFilters[index];
        programCards.forEach(card => {
          const show = !filter || card.querySelector('.' + filter);
          card.style.display = show ? '' : 'none';
        });
      });
    });
  });

  // ============================================================
  // Section Category Nav — 클릭 스크롤 + 스크롤 스파이
  // ============================================================
  (function initSectionCatNav() {
    const nav = document.querySelector('.section-cat-nav');
    if (!nav) return;

    const items = nav.querySelectorAll('.section-cat-nav__item');

    function setActive(target) {
      items.forEach(it => it.classList.toggle('section-cat-nav__item--active', it.dataset.target === target));
    }

    function getActiveLoc() {
      return LOCATIONS.find(l =>
        !document.querySelector('.section--schedule.' + l + '.is-hidden')
      ) || LOCATIONS[0];
    }

    // 클릭 → 해당 섹션으로 스크롤
    items.forEach(item => {
      item.addEventListener('click', function() {
        const target = item.dataset.target;
        const loc = getActiveLoc();
        const selector = target === 'schedule'
          ? '.section--schedule.' + loc
          : '.section--guide.' + loc;
        const el = document.querySelector(selector);
        if (!el) return;
        const top = el.getBoundingClientRect().top + window.scrollY - 80;
        if (smoothScrollTo) smoothScrollTo(top, 700);
        else window.scrollTo({ top, behavior: 'smooth' });
        setActive(target);
      });
    });

    // 스크롤 스파이 — 현재 보이는 섹션 타입에 따라 active 전환
    const allSections = document.querySelectorAll('.section--schedule, .section--guide');
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        if (el.classList.contains('section--schedule')) setActive('schedule');
        else if (el.classList.contains('section--guide')) setActive('guide');
      });
    }, { threshold: 0.3 });

    allSections.forEach(sec => observer.observe(sec));

    // 뷰포트가 좁아져 nav가 container 우측과 겹치면 숨김
    const container = document.querySelector('.container');
    function updateNavVisibility() {
      if (!container) return;
      const navRect = nav.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      nav.style.visibility = navRect.left < containerRect.right ? 'hidden' : 'visible';
    }
    window.addEventListener('resize', updateNavVisibility);
    updateNavVisibility();
  })();

});
