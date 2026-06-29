document.addEventListener('DOMContentLoaded', function() {
  const LOCATIONS = ['Jeju', 'Yeosu', 'Ilsan', 'Gwanggyo'];


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
      const greyIcon = '../assets/images/program/time_icon_grey.svg';
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
    const greyIcon = '../assets/images/program/time_icon_grey.svg';
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
    const heroLoc = document.getElementById('hero-location');
    if (heroLoc) heroLoc.textContent = loc;

    LOCATIONS.forEach(name => {
      const sub = document.getElementById('hero-sub-' + name);
      if (sub) sub.hidden = name !== loc;
    });

    LOCATIONS.forEach(name => {
      const vid = document.getElementById('hero-video-' + name);
      if (!vid) return;
      if (name === loc) {
        vid.style.display = 'block';
        vid.play().catch(() => {});
      } else {
        vid.style.display = 'none';
        vid.pause();
      }
    });

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

  if (locationTabs.length || gnbLocationItems.length) {
    // URL 파라미터(?loc=Yeosu 등)가 있으면 해당 지역으로 진입
    const locParam = new URLSearchParams(window.location.search).get('loc');
    const fromUrl = LOCATIONS.find(l => l.toLowerCase() === (locParam || '').toLowerCase());
    if (fromUrl) {
      selectLocation(fromUrl);
    } else {
      const activeTab = document.querySelector('.cartegory-tabs-a__item--active');
      const activeGnb = document.querySelector('.gnb__dropdown-item--active[data-location]');
      if (activeTab) {
        selectLocation(activeTab.textContent.trim());
      } else if (activeGnb) {
        selectLocation(activeGnb.dataset.location);
      } else if (locationTabs.length) {
        selectLocation(locationTabs[0].textContent.trim());
      } else if (gnbLocationItems.length) {
        selectLocation(gnbLocationItems[0].dataset.location);
      }
    }
  }

  // 리사이즈 시 보이는 일정표만 재계산
  window.addEventListener('resize', function() {
    document.querySelectorAll('.section--schedule:not(.is-hidden) .schedule-table').forEach(table => {
      if (typeof table._relayout === 'function') table._relayout();
    });
  });

  // ============================================================
  // Section entrance reveal — title first, content follows
  // ============================================================
  (function initProgramSectionReveal() {
    const groups = Array.from(document.querySelectorAll('.section--schedule')).map(section => ({
      section,
      titles: [section.querySelector('.section__header')],
      contents: Array.from(section.querySelectorAll('.cartegory-tabs-b, .program-preview, .schedule-table'))
    })).filter(group =>
      group.section && (group.titles.some(Boolean) || group.contents.some(Boolean))
    );

    if (!groups.length) return;

    groups.forEach(group => {
      group.titles.forEach(el => el && el.classList.add('program-reveal-title'));
      group.contents.forEach(el => el && el.classList.add('program-reveal-content'));
    });

    function showGroup(group) {
      group.titles.concat(group.contents).forEach(el => {
        if (!el) return;
        window.clearTimeout(el._programRevealTimer);
        el.classList.add('is-program-reveal-active', 'is-program-reveal-visible');
        el._programRevealTimer = window.setTimeout(() => {
          el.classList.add('is-program-reveal-done');
        }, 1300);
      });
    }

    function resetGroup(group) {
      group.titles.concat(group.contents).forEach(el => {
        if (!el) return;
        window.clearTimeout(el._programRevealTimer);
        el.classList.remove('is-program-reveal-active', 'is-program-reveal-visible', 'is-program-reveal-done');
      });
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduceMotion.matches || !('IntersectionObserver' in window)) {
      groups.forEach(showGroup);
      return;
    }

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const group = groups.find(item => item.section === entry.target);
        if (!group) return;
        if (entry.isIntersecting) showGroup(group);
        else resetGroup(group);
      });
    }, {
      threshold: 0.08,
      rootMargin: '0px 0px -22% 0px'
    });

    groups.forEach(group => observer.observe(group.section));
  })();

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
        openByKey(slot.dataset.program);
      });
    });

    // 새 카드형 레이아웃 .time-block__item → 모달 열기
    scheduleSection.querySelectorAll('.time-block__item[data-program]').forEach(item => {
      item.addEventListener('click', function() {
        openByKey(item.dataset.program);
      });
    });

    function openByKey(key) {
      if (!key || !guideSection) return;
      const card = guideSection.querySelector('.program-card[data-program="' + key + '"]');
      if (!card) return;
      const nameEl = card.querySelector('.program-card__title');
      const tagEl  = card.querySelector('.tag');
      const imgEls = card.querySelectorAll('.program-card__detail-img');
      const imgSrcs = Array.from(imgEls).map(el => el.getAttribute('src')).filter(Boolean);
      const imgTransforms = Array.from(imgEls).map(el => el.style.transform || '');
      const imgPositions = Array.from(imgEls).map(el => el.style.objectPosition || '');
      openDetailModal({
        key,
        name:    nameEl ? nameEl.textContent.trim() : '',
        tagText: tagEl  ? tagEl.textContent.trim()  : '',
        imgSrc:  imgSrcs[0] || '',
        imgSrcs,
        imgTransforms,
        imgPositions
      }, guideSection);
    }
  });

  // ============================================================
  // 카테고리 탭(cartegory-tabs-b)으로 program-card 필터링 (가이드 섹션마다)
  // ============================================================
  const categoryFilters = [null, 'tag--education', 'tag--performance', 'tag--experience'];
  document.querySelectorAll('.section--guide').forEach(guideSection => {
    const categoryTabs = guideSection.querySelectorAll('.cartegory-tabs-b__item');
    const programCards = guideSection.querySelectorAll('.program-card');
    const isJeju = guideSection.classList.contains('Jeju');

    categoryTabs.forEach((tab, index) => {
      tab.addEventListener('click', function() {
        categoryTabs.forEach(t => t.classList.remove('cartegory-tabs-b__item--active'));
        tab.classList.add('cartegory-tabs-b__item--active');

        const filter = categoryFilters[index];
        programCards.forEach(card => {
          const show = !filter || card.querySelector('.' + filter);
          card.style.display = show ? '' : 'none';
        });

        if (isJeju) {
          const previewEl = document.querySelector('.section--schedule.Jeju .program-preview');
          if (previewEl && previewEl._jumpToKey) previewEl._jumpToKey('d');
        }
      });
    });
  });

  // ============================================================
  // Program Detail Modal (싱글톤 — 모든 캐러셀 공유)
  // ============================================================
  const detailOverlay = document.querySelector('.program-detail-overlay');

  let _detailImgInterval = null;

  function openDetailModal(prog, guideSection) {
    const imgA       = detailOverlay.querySelector('.program-detail-modal__img--a');
    const imgB       = detailOverlay.querySelector('.program-detail-modal__img--b');
    const modalTag   = detailOverlay.querySelector('.program-detail-modal__tag');
    const modalTitle = detailOverlay.querySelector('.program-detail-modal__title');
    const modalContent = detailOverlay.querySelector('.program-detail-modal__content');

    modalTag.className = 'program-detail-modal__tag tag';
    if (prog.tagText === '생태설명회')   modalTag.classList.add('tag--education');
    else if (prog.tagText === '공연프로그램') modalTag.classList.add('tag--performance');
    else if (prog.tagText === '체험프로그램') modalTag.classList.add('tag--experience');
    modalTag.textContent = prog.tagText;
    modalTitle.textContent = prog.name;

    const srcs = (prog.imgSrcs && prog.imgSrcs.length) ? prog.imgSrcs : (prog.imgSrc ? [prog.imgSrc] : []);
    const transforms = prog.imgTransforms || [];
    const positions  = prog.imgPositions  || [];
    imgA.src = srcs[0] || '';
    imgA.alt = prog.name;
    imgA.style.transform = transforms[0] || '';
    imgA.style.objectPosition = positions[0] || '';
    imgB.src = srcs[1] || srcs[0] || '';
    imgB.alt = prog.name;
    imgB.style.transform = transforms[1] || transforms[0] || '';
    imgB.style.objectPosition = positions[1] || positions[0] || '';
    imgA.classList.add('active');
    imgB.classList.remove('active');

    if (_detailImgInterval) clearInterval(_detailImgInterval);
    if (srcs.length >= 2) {
      let showingA = true;
      _detailImgInterval = setInterval(() => {
        showingA = !showingA;
        imgA.classList.toggle('active', showingA);
        imgB.classList.toggle('active', !showingA);
      }, 2000);
    }

    modalContent.innerHTML = '';
    if (guideSection && prog.key) {
      const programCard = guideSection.querySelector(`.program-card[data-program="${prog.key}"]`);
      if (programCard) {
        const detail = programCard.querySelector('.program-card__detail');
        if (detail) {
          Array.from(detail.children).forEach(child => {
            if (!child.classList.contains('program-card__detail-img')) {
              modalContent.appendChild(child.cloneNode(true));
            }
          });
        }
      }
    }

    // 클론된 이미지 교체
    modalContent.querySelectorAll('.detail-modal__location img').forEach(img => {
      img.src = 'assets/images/chevron_right_white.svg';
    });
    modalContent.querySelectorAll('.detail-modal__meta-label .img img').forEach(img => {
      img.src = 'assets/images/alert_white.svg';
    });

    detailOverlay.classList.add('program-detail-overlay--open');
    document.body.style.overflow = 'hidden';

    const modalHeader = detailOverlay.querySelector('.program-detail-modal__header');
    requestAnimationFrame(() => {
      const lineHeight = parseFloat(getComputedStyle(modalTitle).lineHeight) || modalTitle.offsetHeight;
      modalHeader.classList.toggle('title-wrapped', modalTitle.offsetHeight > lineHeight * 1.2);
    });
  }

  function closeDetailModal() {
    if (_detailImgInterval) { clearInterval(_detailImgInterval); _detailImgInterval = null; }
    detailOverlay.classList.remove('program-detail-overlay--open');
    document.body.style.overflow = '';
  }

  detailOverlay.addEventListener('click', e => {
    if (e.target === detailOverlay) closeDetailModal();
  });
  detailOverlay.querySelector('.program-detail-modal__close').addEventListener('click', closeDetailModal);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeDetailModal();
  });

  // ============================================================
  // Program Preview Carousel — .schedule-time-grid 데이터 기반 동적 생성
  // ============================================================
  document.querySelectorAll('.section--schedule').forEach(scheduleSection => {
    const previewEls = scheduleSection.querySelectorAll('.program-preview');
    if (!previewEls.length) return;

    const loc = LOCATIONS.find(l => scheduleSection.classList.contains(l));
    const guideSection = document.querySelector(`.section--guide${loc ? '.' + loc : ''}`);

    // 고유 프로그램 수집 (schedule-time-grid 순서 기준)
    const seen = new Set();
    const programs = [];
    scheduleSection.querySelectorAll('.schedule-time-grid .time-block__item[data-program]').forEach(item => {
      const key = item.dataset.program;
      if (seen.has(key)) return;
      seen.add(key);

      const nameEl = item.querySelector('.time-block__item-name');
      const tagEl  = item.querySelector('.tag');
      let imgSrc = '';

      let imgSrcs = [];
      let imgTransforms = [];
      let imgPositions = [];
      if (guideSection) {
        const card = guideSection.querySelector(`.program-card[data-program="${key}"]`);
        const imgs = card && card.querySelectorAll('.program-card__detail-img');
        if (imgs) {
          imgSrcs = Array.from(imgs).map(el => el.getAttribute('src')).filter(Boolean);
          imgTransforms = Array.from(imgs).map(el => el.style.transform || '');
          imgPositions = Array.from(imgs).map(el => el.style.objectPosition || '');
        }
        if (imgSrcs.length) imgSrc = imgSrcs[0];
      }

      programs.push({
        key,
        name:    nameEl ? nameEl.textContent.trim() : '',
        tagText: tagEl  ? tagEl.textContent.trim()  : '',
        imgSrc,
        imgSrcs,
        imgTransforms,
        imgPositions
      });
    });

    if (programs.length < 2) return;

    // 모든 프로그램 이미지 미리 캐시
    programs.forEach(prog => {
      if (prog.imgSrc) { const img = new Image(); img.src = prog.imgSrc; }
    });

    previewEls.forEach(previewEl => {
    let carouselPrograms = programs.slice();
    let total = carouselPrograms.length;
    const defaultName = previewEl.dataset.defaultProgram || '';
    const defaultIdx = defaultName
      ? (carouselPrograms.findIndex(p => p.key === defaultName) >= 0
          ? carouselPrograms.findIndex(p => p.key === defaultName)
          : carouselPrograms.findIndex(p => p.name === defaultName))
      : -1;
    let currentIndex = defaultIdx >= 0 ? defaultIdx : 0;
    let animating = false;

    function setCardTransform(card, cPct) {
      const dist  = Math.abs(cPct - 50);
      const t     = Math.min(1, dist / STEP);
      const scale = 1 - t * (1 - SW / CW);
      const tx    = (cPct - 50) * (100 / CW);
      // 슬롯 근처(STEP*1.2 이내)에서만 페이드인/아웃 — 전환 중 외부 카드 안 보임
      const farT  = Math.max(0, (dist - STEP) / (STEP * 0.2));
      const op    = dist >= STEP * 1.2 ? 0 : dist > STEP ? 0.85 * (1 - farT) : 1 - t * 0.15;
      const z     = dist < STEP * 0.5 ? 2 : dist >= STEP * 2 ? 0 : 1;
      card.style.transform = `translateY(-50%) translateX(${tx.toFixed(3)}%) scale(${scale.toFixed(4)})`;
      card.style.opacity   = op.toFixed(3);
      card.style.zIndex    = String(z);
    }

    const TAG_CLASS = { '생태설명회': 'tag--education', '공연프로그램': 'tag--performance', '체험프로그램': 'tag--experience' };

    function startCardImgCycle(card, srcs) {
      if (card._imgInterval) { clearInterval(card._imgInterval); card._imgInterval = null; }
      const imgA = card.querySelector('.card-img--a');
      const imgB = card.querySelector('.card-img--b');
      if (!imgA || !imgB) return;
      imgA.classList.add('active');
      imgB.classList.remove('active');
      if (srcs.length < 2) return;
      let showingA = true;
      card._imgInterval = setInterval(() => {
        showingA = !showingA;
        imgA.classList.toggle('active', showingA);
        imgB.classList.toggle('active', !showingA);
      }, 2000);
    }

    function makeCard(prog) {
      const div = document.createElement('div');
      div.className = 'program-preview__card';
      const tagCls = TAG_CLASS[prog.tagText] || '';
      const srcs = (prog.imgSrcs && prog.imgSrcs.length >= 2) ? prog.imgSrcs : [prog.imgSrc || ''];
      const transforms = prog.imgTransforms || [];
      div.innerHTML = `
        <div class="card-img-wrap">
          <img class="card-img--a active" src="${srcs[0]}" alt="${prog.name}">
          <img class="card-img--b" src="${srcs[1] || srcs[0]}" alt="${prog.name}">
        </div>
        <div class="program-preview__info">
          <span class="program-preview__tag ${tagCls}">${prog.tagText}</span>
          <p class="program-preview__title">${prog.name}</p>
        </div>`;
      const positions = prog.imgPositions || [];
      const imgA = div.querySelector('.card-img--a');
      const imgB = div.querySelector('.card-img--b');
      if (imgA) { imgA.style.transform = transforms[0] || ''; imgA.style.objectPosition = positions[0] || ''; }
      if (imgB) { imgB.style.transform = transforms[1] || transforms[0] || ''; imgB.style.objectPosition = positions[1] || positions[0] || ''; }
      startCardImgCycle(div, srcs);
      return div;
    }

    function fillCard(card, prog) {
      const srcs = (prog.imgSrcs && prog.imgSrcs.length >= 2) ? prog.imgSrcs : [prog.imgSrc || ''];
      const transforms = prog.imgTransforms || [];
      const imgA = card.querySelector('.card-img--a');
      const imgB = card.querySelector('.card-img--b');
      const positions = prog.imgPositions || [];
      if (imgA) { imgA.src = srcs[0]; imgA.alt = prog.name; imgA.style.transform = transforms[0] || ''; imgA.style.objectPosition = positions[0] || ''; }
      if (imgB) { imgB.src = srcs[1] || srcs[0]; imgB.alt = prog.name; imgB.style.transform = transforms[1] || transforms[0] || ''; imgB.style.objectPosition = positions[1] || positions[0] || ''; }
      startCardImgCycle(card, srcs);
      const tagEl = card.querySelector('.program-preview__tag');
      tagEl.className = 'program-preview__tag ' + (TAG_CLASS[prog.tagText] || '');
      tagEl.textContent  = prog.tagText;
      card.querySelector('.program-preview__title').textContent = prog.name;
    }

    let cards     = [];
    let extraCard = null; // 항상 DOM에 존재, 드래그 시 재사용

    function buildCarousel() {
      previewEl.innerHTML = '';
      extraCard = null;

      if (total === 1) {
        const C = makeCard(carouselPrograms[0]);
        C.style.transition = 'none';
        setCardTransform(C, 50);
        previewEl.append(C);
        cards = [null, C, null];
        updateCenterClass();
        requestAnimationFrame(() => requestAnimationFrame(() => { C.style.transition = ''; }));
        return;
      }

      const prevIdx  = (currentIndex - 1 + total) % total;
      const nextIdx  = (currentIndex + 1) % total;
      const extraIdx = (currentIndex + 2) % total;

      const L = makeCard(carouselPrograms[prevIdx]);
      const C = makeCard(carouselPrograms[currentIndex]);
      const R = makeCard(carouselPrograms[nextIdx]);
      extraCard = makeCard(carouselPrograms[extraIdx]);

      [L, C, R, extraCard].forEach(el => { el.style.transition = 'none'; });
      setCardTransform(L, 24.5);
      setCardTransform(C, 50);
      setCardTransform(R, 75.5);
      setCardTransform(extraCard, 101 + STEP);

      previewEl.append(L, C, R, extraCard);
      cards = [L, C, R];
      updateCenterClass();

      requestAnimationFrame(() => requestAnimationFrame(() => {
        [L, C, R].forEach(el => { el.style.transition = ''; });
      }));
    }

    // ── 트랙 슬라이딩 방식 ──────────────────────────────────────
    // 카드들이 드래그와 함께 물리적으로 이동하면서 중심 거리에 따라 크기 변화
    //
    // 슬롯 center 위치(컨테이너 너비 %):
    //   L=24.5  C=50  R=75.5  (간격 25.5%)
    // width: center(63%)  side(49%)  diff=14%
    //
    const STEP     = 25.5; // 슬롯 간 center 간격 (%)
    const CW       = 63;   // center 카드 width %
    let SW         = parseInt(previewEl.dataset.sw ?? '57', 10); // side 카드 width %
    const SNAP_PX  = 160;  // 전환 확정 최소 드래그 픽셀

    let dragActive   = false;
    let dragDir      = 0;
    let dragPrepared = false;
    let dragStartX   = 0;
    let track        = [];   // 드래그 중 4장의 카드 배열

    // offsetPct 만큼 이동 (transition 없이, 직접 transform 적용)
    function applyTrack(offsetPct) {
      const bases = dragDir > 0
        ? [24.5, 50, 75.5, 101]
        : [-1, 24.5, 50, 75.5];

      track.forEach((card, i) => {
        const c = bases[i] - offsetPct * dragDir;
        setCardTransform(card, c);
      });
    }

    // 드래그 방향 확정 시: extraCard를 재사용해 화면 밖에 배치 (DOM 삽입 없음)
    function prepareTrack(dir) {
      const [L, C, R] = cards;
      [L, C, R, extraCard].forEach(el => { el.style.transition = 'none'; });

      fillCard(extraCard, carouselPrograms[
        dir > 0
          ? (currentIndex + 2) % total
          : (currentIndex - 2 + total) % total
      ]);

      if (dir > 0) {
        setCardTransform(extraCard, 101 + STEP); // 오른쪽 밖 (opacity=0)
        track = [L, C, R, extraCard];
      } else {
        setCardTransform(extraCard, -1 - STEP); // 왼쪽 밖 (opacity=0)
        track = [extraCard, L, C, R];
      }
    }

    // 손 뗄 때: 확정 또는 복귀 스냅
    let pendingDir     = 0;
    let moveRafId      = null;
    let stepsCommitted = 0;

    function snapTrack(commit, dur = 280) {
      animating = true;
      const dir    = dragDir;
      const DUR    = dur;
      const target = commit ? STEP : 0;

      track.forEach(el => {
        el.style.transition = `transform ${DUR}ms cubic-bezier(0.25,0.46,0.45,0.94), opacity ${DUR}ms ease`;
      });
      applyTrack(target);

      setTimeout(() => {
        track.forEach(el => { el.style.transition = ''; });

        if (commit) {
          if (dir > 0) {
            currentIndex = (currentIndex + 1) % total;
            const [oldL, newL, newC, newR] = track;
            // oldL을 제거하지 않고 새 extraCard로 재사용
            extraCard = oldL;
            setCardTransform(extraCard, 101 + STEP);
            cards = [newL, newC, newR];
          } else {
            currentIndex = (currentIndex - 1 + total) % total;
            const [newL, newC, newR, oldR] = track;
            extraCard = oldR;
            setCardTransform(extraCard, -1 - STEP);
            cards = [newL, newC, newR];
          }
          updateCenterClass();
          track = cards;
        } else {
          // 복귀: extraCard를 다시 원래 자리로
          setCardTransform(extraCard, dir > 0 ? 101 + STEP : -1 - STEP);
          track = cards;
        }

        // 큐에 다음 방향이 있으면 바로 실행
        if (pendingDir !== 0) {
          const next = pendingDir;
          pendingDir = 0;
          dragDir = next;
          prepareTrack(dragDir);
          snapTrack(true, 220);
          dragDir = 0;
        } else {
          animating = false;
        }
      }, DUR + 16);
    }

    // 드래그 중 한 스텝을 transition 없이 즉시 확정
    function commitInstant(dir) {
      track.forEach(el => { el.style.transition = 'none'; });
      applyTrack(STEP);
      if (dir > 0) {
        currentIndex = (currentIndex + 1) % total;
        const [oldL, newL, newC, newR] = track;
        extraCard = oldL;
        cards = [newL, newC, newR];
      } else {
        currentIndex = (currentIndex - 1 + total) % total;
        const [newL, newC, newR, oldR] = track;
        extraCard = oldR;
        cards = [newL, newC, newR];
      }
      updateCenterClass();
      track = cards;
    }

    function updateCenterClass() {
      cards.forEach((c, i) => {
        if (!c) return;
        c.classList.toggle('is-center', i === 1);
      });
    }

    previewEl.style.userSelect = 'none';
    previewEl.style.touchAction = 'pan-y';

    previewEl.addEventListener('pointerdown', e => {
      if (animating || total <= 1) return;
      dragStartX      = e.clientX;
      dragActive      = true;
      dragDir         = 0;
      dragPrepared    = false;
      stepsCommitted  = 0;
      previewEl.setPointerCapture(e.pointerId);
    });

    previewEl.addEventListener('pointermove', e => {
      if (!dragActive || animating) return;
      const delta = e.clientX - dragStartX;

      if (!dragPrepared) {
        if (Math.abs(delta) < 6) return;
        dragDir = delta < 0 ? 1 : -1;
        prepareTrack(dragDir);
        dragPrepared = true;
      }

      const pxTotal = Math.abs(delta);
      if (moveRafId) cancelAnimationFrame(moveRafId);
      moveRafId = requestAnimationFrame(() => {
        moveRafId = null;
        // 드래그 거리가 SNAP_PX 배수를 넘을 때마다 즉시 커밋 → 연속 슬라이드
        let pxRem = pxTotal - stepsCommitted * SNAP_PX;
        while (pxRem >= SNAP_PX) {
          commitInstant(dragDir);
          stepsCommitted++;
          prepareTrack(dragDir);
          pxRem -= SNAP_PX;
        }
        applyTrack(pxRem / SNAP_PX * STEP);
      });
    });

    previewEl.addEventListener('pointerup', e => {
      if (!dragActive) return;
      dragActive = false;
      if (moveRafId) { cancelAnimationFrame(moveRafId); moveRafId = null; }
      if (!dragPrepared) {
        stepsCommitted = 0;
        // setPointerCapture로 e.target이 previewEl이 되므로 elementFromPoint로 실제 요소 확인
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const tappedCard = el && el.closest('.program-preview__card');
        if (tappedCard && tappedCard === cards[1]) {
          openDetailModal(carouselPrograms[currentIndex], guideSection);
        }
        return;
      }

      const pxTotal = Math.abs(e.clientX - dragStartX);
      const pxRem   = pxTotal - stepsCommitted * SNAP_PX;
      snapTrack(pxRem >= SNAP_PX * 0.3);
      dragDir = 0; dragPrepared = false; stepsCommitted = 0;
    });

    previewEl.addEventListener('pointercancel', () => {
      if (moveRafId) { cancelAnimationFrame(moveRafId); moveRafId = null; }
      if (dragActive && dragPrepared) snapTrack(false);
      dragActive = false; dragDir = 0; dragPrepared = false; stepsCommitted = 0;
    });

    previewEl.addEventListener('dragstart', e => e.preventDefault());

    let wheelAccum   = 0;
    let wheelResetId = null;
    const WHEEL_THRESHOLD = 250;

    previewEl.addEventListener('wheel', e => {
      e.preventDefault();
      if (total <= 1) return;
      const raw = Math.abs(e.deltaX) >= Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (Math.abs(raw) < 1) return;
      const dir = raw > 0 ? 1 : -1;

      // 방향이 바뀌면 누적 초기화
      if (wheelAccum !== 0 && Math.sign(raw) !== Math.sign(wheelAccum)) wheelAccum = 0;
      wheelAccum += raw;

      // 스크롤 멈추면 200ms 후 누적 초기화
      if (wheelResetId) clearTimeout(wheelResetId);
      wheelResetId = setTimeout(() => { wheelAccum = 0; wheelResetId = null; }, 200);

      if (Math.abs(wheelAccum) < WHEEL_THRESHOLD) return;
      wheelAccum = 0;

      if (animating) { pendingDir = dir; return; }
      dragDir = dir;
      prepareTrack(dragDir);
      snapTrack(true, 220);
      dragDir = 0;
    }, { passive: false });

    buildCarousel();

    // 자동 전환 (3.5초마다 다음 카드)
    const AUTO_INTERVAL = 3500;
    let autoTimer = null;

    function startAuto() {
      stopAuto();
      if (total <= 1) return;
      autoTimer = setInterval(() => {
        if (animating || total <= 1) return;
        dragDir = 1;
        prepareTrack(dragDir);
        snapTrack(true, 220);
        dragDir = 0;
      }, AUTO_INTERVAL);
    }

    function stopAuto() {
      if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
    }

    // 사용자 조작 시 타이머 리셋
    previewEl.addEventListener('pointerdown', startAuto, { capture: true });
    previewEl.addEventListener('wheel', startAuto, { capture: true, passive: true });

    startAuto();

    // 탭 필터 연동
    previewEl._setFilter = function(filterText) {
      stopAuto();
      carouselPrograms = filterText
        ? programs.filter(p => p.tagText === filterText)
        : programs.slice();
      if (carouselPrograms.length < 1) carouselPrograms = programs.slice();
      total = carouselPrograms.length;
      const preferred = defaultName
        ? (carouselPrograms.findIndex(p => p.key === defaultName) >= 0
            ? carouselPrograms.findIndex(p => p.key === defaultName)
            : carouselPrograms.findIndex(p => p.name === defaultName))
        : -1;
      currentIndex = preferred >= 0 ? preferred : 0;
      animating = false;
      pendingDir = 0;
      buildCarousel();
      startAuto();
    };

    previewEl._jumpToKey = function(key) {
      const idx = carouselPrograms.findIndex(p => p.key === key);
      if (idx < 0 || idx === currentIndex) return;
      currentIndex = idx;
      animating = false;
      pendingDir = 0;
      buildCarousel();
    };

    }); // end previewEls.forEach

  });

  // ============================================================
  // cartegory-tabs-b (schedule section) → program-preview + time-block 연동
  // ============================================================
  document.querySelectorAll('.section--schedule').forEach(scheduleSection => {
    const tabsB = scheduleSection.querySelector('.cartegory-tabs-b');
    if (!tabsB) return;

    const tabItems = tabsB.querySelectorAll('.cartegory-tabs-b__item');

    // 탭 순서: 전체 / 생태설명회 / 공연프로그램 / 체험프로그램
    const tagMap = ['', '생태설명회', '공연프로그램', '체험프로그램'];

    tabItems.forEach((tab, index) => {
      tab.addEventListener('click', function() {
        tabItems.forEach(t => t.classList.remove('cartegory-tabs-b__item--active'));
        tab.classList.add('cartegory-tabs-b__item--active');

        const filterText = tagMap[index];

        // program-preview 캐러셀 필터 재빌드
        scheduleSection.querySelectorAll('.program-preview').forEach(previewEl => {
          if (previewEl._setFilter) previewEl._setFilter(filterText);
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

    // 히어로 섹션이 보이는 동안 nav 숨김
    const heroEl = document.querySelector('.hero');
    if (heroEl) {
      const heroObserver = new IntersectionObserver(entries => {
        const heroVisible = entries[0].isIntersecting;
        nav.style.opacity = heroVisible ? '0' : '';
        nav.style.pointerEvents = heroVisible ? 'none' : '';
      }, { threshold: 0.05 });
      heroObserver.observe(heroEl);
    }

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

  // GNB 스크롤 숨김/표시
  (function() {
    const gnb = document.getElementById('gnb');
    if (!gnb) return;
    const THRESHOLD = window.innerHeight * 0.1;
    let lastY = 0;

    window.addEventListener('scroll', function() {
      const currentY = window.scrollY;
      if (currentY > THRESHOLD && currentY > lastY) {
        gnb.classList.add('gnb--hidden');
      } else if (currentY < lastY) {
        gnb.classList.remove('gnb--hidden');
      }
      lastY = currentY;
    }, { passive: true });
  })();

  // ── GNB 모바일 메뉴 ──
  (function initMobileMenu() {
    const hamburger  = document.querySelector('.gnb__hamburger');
    const mobileMenu = document.querySelector('.gnb__mobile-menu');
    if (!hamburger || !mobileMenu) return;

    function openMenu() {
      hamburger.classList.add('is-active');
      hamburger.setAttribute('aria-expanded', 'true');
      mobileMenu.classList.add('is-open');
      mobileMenu.setAttribute('aria-hidden', 'false');
      document.body.classList.add('mobile-menu-open');
    }

    function closeMenu() {
      hamburger.classList.remove('is-active');
      hamburger.setAttribute('aria-expanded', 'false');
      mobileMenu.classList.remove('is-open');
      mobileMenu.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('mobile-menu-open');
    }

    hamburger.addEventListener('click', () => {
      hamburger.getAttribute('aria-expanded') === 'true' ? closeMenu() : openMenu();
    });

    mobileMenu.querySelectorAll('.gnb__mobile-link--toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = btn.closest('.gnb__mobile-item');
        const isOpen = item.classList.contains('is-open');
        mobileMenu.querySelectorAll('.gnb__mobile-item.is-open').forEach(el => {
          el.classList.remove('is-open');
          el.querySelector('.gnb__mobile-link--toggle').setAttribute('aria-expanded', 'false');
        });
        if (!isOpen) {
          item.classList.add('is-open');
          btn.setAttribute('aria-expanded', 'true');
        }
      });
    });

    mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && mobileMenu.classList.contains('is-open')) closeMenu();
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 1024) closeMenu();
    });
  })();

});

