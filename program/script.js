document.addEventListener('DOMContentLoaded', function() {
  const scheduleHoursRowFull = document.querySelector('.schedule-hours-row--full');
  const scheduleHoursRowHalf = document.querySelector('.schedule-hours-row--half');
  const scheduleSectionPrograms = document.querySelectorAll('.schedule-section__programs');

  let isScrolling = false;

  // 시간 탭 클릭 이벤트
  const hourButtons = scheduleHoursRowFull.querySelectorAll('.schedule-hour');

  hourButtons.forEach((button) => {
    button.addEventListener('click', function() {
      // 기존 활성화 제거 (full)
      hourButtons.forEach(btn => {
        btn.classList.remove('schedule-hour--active');
      });

      // 기존 활성화 제거 (half)
      const halfHours = scheduleHoursRowHalf.querySelectorAll('.schedule-hour');
      halfHours.forEach(hour => {
        hour.classList.remove('schedule-hour--active');
      });

      // 현재 버튼 활성화 (full)
      button.classList.add('schedule-hour--active');

      // 선택된 시간 추출
      const selectedTime = button.textContent.trim();
      const selectedHour = parseInt(selectedTime.split(':')[0]);

      // half에서 같은 data-hour 활성화
      const targetHour = scheduleHoursRowHalf.querySelector(`[data-hour="${String(selectedHour).padStart(2, '0')}"]`);
      if (targetHour) {
        targetHour.classList.add('schedule-hour--active');
      }

      // 프로그램 필터링 및 배경색 변경
      highlightProgramsByTime(selectedHour);

      // 스크롤 동기화
      syncScrolls(selectedHour);
    });
  });

  // 선택된 시간대 프로그램 하이라이트
  function highlightProgramsByTime(selectedHour) {
    const greyIcon = '../assets/images/time_icon_grey.svg';
    const whiteIcon = '../assets/images/time_icon_white.svg';

    // 모든 program-slot의 하이라이트 제거 + 아이콘 grey로 복원
    document.querySelectorAll('.program-slot').forEach(slot => {
      slot.classList.remove('program-slot--active');
      const icon = slot.querySelector('.program-time__icon img');
      if (icon) icon.src = greyIcon;
    });

    // 선택된 시간대의 프로그램만 배경색 변경 + 아이콘 white로 변경
    scheduleSectionPrograms.forEach(programsContainer => {
      const programSlots = programsContainer.querySelectorAll('.program-slot');

      programSlots.forEach(slot => {
        const timeEl = slot.querySelector('.program-time');
        if (timeEl) {
          const timeText = timeEl.textContent.trim();
          const startTime = parseInt(timeText.split(':')[0]);

          if (startTime === selectedHour) {
            slot.classList.add('program-slot--active');
            const icon = slot.querySelector('.program-time__icon img');
            if (icon) icon.src = whiteIcon;
          }
        }
      });
    });
  }

  // 스크롤 동기화 함수
  function syncScrolls(selectedHour) {
    // data-hour 속성으로 정확한 요소 찾기
    const targetHour = scheduleHoursRowHalf.querySelector(`[data-hour="${String(selectedHour).padStart(2, '0')}"]`);

    if (targetHour) {
      const targetIndex = selectedHour - 9;

      // 처음 두 시간(09:00, 10:00)은 스크롤하지 않음
      if (targetIndex < 2) {
        scheduleHoursRowHalf.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        // 11시부터는 선택한 시간(active)의 left가 6번째 .schedule-hour의 right에 오도록 스크롤
        // 기준은 스크롤되지 않는 full row의 6번째 칸(고정 눈금)
        const fullHours = scheduleHoursRowFull.querySelectorAll('.schedule-hour');
        const anchor = fullHours[5]; // 6번째 .schedule-hour
        const anchorRight = anchor.getBoundingClientRect().right;

        // 19시는 18시 위치를 그대로 유지 (마지막 시간은 더 스크롤하지 않음)
        const alignHour = selectedHour === 19 ? 18 : selectedHour;
        const alignTarget = scheduleHoursRowHalf.querySelector(`[data-hour="${String(alignHour).padStart(2, '0')}"]`);
        const targetLeft = alignTarget.getBoundingClientRect().left;

        // active의 left를 anchorRight에 맞추되, 거기서 왼쪽으로 5px 이동
        const scrollValue = scheduleHoursRowHalf.scrollLeft + (targetLeft - anchorRight) + 5;

        scheduleHoursRowHalf.scrollTo({ left: Math.max(0, scrollValue), behavior: 'smooth' });
      }
    }

    // .schedule-section__programs 가로 스크롤
    scheduleSectionPrograms.forEach(programsContainer => {
      // 선택된 시간대의 첫 번째 program-slot 찾기
      const slots = programsContainer.querySelectorAll('.program-slot');
      let firstMatchingSlot = null;

      slots.forEach(slot => {
        if (!firstMatchingSlot) {
          const timeEl = slot.querySelector('.program-time');
          if (timeEl) {
            const timeText = timeEl.textContent.trim();
            const startTime = parseInt(timeText.split(':')[0]);

            if (startTime === selectedHour) {
              firstMatchingSlot = slot;
            }
          }
        }
      });

      if (firstMatchingSlot) {
        const containerWidth = programsContainer.clientWidth;
        const slotLeft = firstMatchingSlot.offsetLeft;
        const slotWidth = firstMatchingSlot.offsetWidth;

        programsContainer.scrollTo({ left: slotLeft - (containerWidth / 2) + (slotWidth / 2), behavior: 'smooth' });
      }
    });
  }

  // 프로그램들을 시간에 맞게 정렬
  function alignProgramsByTime() {
    const hourElements = scheduleHoursRowHalf.querySelectorAll('.schedule-hour');

    // 09:00과 10:00의 offsetLeft 차이로 시간당 픽셀 계산
    const hour09 = hourElements[0];
    const hour10 = hourElements[1];
    const pixelPerHour = hour10.offsetLeft - hour09.offsetLeft;

    // 모든 floor의 줄(group)을 모아 전체에서 가장 넓은 줄 기준으로 width를 통일하기 위함
    // (floor별로 따로 통일하면 floor 간 길이가 달라 border가 들쭉날쭉해짐)
    const allGroups = [];
    const allRights = [];

    // 각 program-group을 처리
    scheduleSectionPrograms.forEach(programsContainer => {
      const programGroups = programsContainer.querySelectorAll('.program-group');

      programGroups.forEach(group => {
        const slots = group.querySelectorAll('.program-slot');

        // 시간 위치로만 간격을 표현하기 위해 기본 gap 제거
        group.style.gap = '0';

        // width 재계산을 위해 이전 인라인 width 초기화
        group.style.width = '';

        // 이전 슬롯이 차지한 오른쪽 끝 위치(09:00을 0으로 한 px)
        let prevRightEdge = 0;

        slots.forEach(slot => {
          const timeText = slot.querySelector('.program-time').textContent.trim();
          const [startTimeStr, endTimeStr] = timeText.split(' - ').map(t => t.trim());
          const [startHour, startMin] = startTimeStr.split(':').map(Number);
          const [endHour, endMin] = (endTimeStr || '').split(':').map(Number);

          // 09:00을 0으로 한 시작 시간의 절대 위치(px)
          // 14:30 → (5 + 0.5) * pixelPerHour → 14:00과 15:00 중앙
          const startPos = (startHour - 9 + startMin / 60) * pixelPerHour;

          // 진행 시간(시간 단위)에 해당하는 width 계산
          let durationHours = (endHour + endMin / 60) - (startHour + startMin / 60);
          if (durationHours < 0) durationHours += 24; // 자정을 넘기는 경우
          const durationWidth = durationHours * pixelPerHour;

          // 기본 width로 되돌린 뒤, 진행 시간 width가 더 길 때만 적용
          // (기본 width보다 짧아져야 하면 기본 width 유지)
          slot.style.width = '';
          if (Number.isFinite(durationWidth) && durationWidth > slot.offsetWidth) {
            slot.style.width = durationWidth + 'px';
          }

          // 이전 슬롯 끝에서 시작 위치까지의 거리만큼 marginLeft 부여
          slot.style.marginLeft = (startPos - prevRightEdge) + 'px';

          // 이번 슬롯의 오른쪽 끝 갱신 (실제 적용된 width 기준)
          prevRightEdge = startPos + slot.offsetWidth;
        });

        // 이 줄의 콘텐츠 오른쪽 끝 기록
        allGroups.push(group);
        allRights.push(prevRightEdge);
      });
    });

    // 전체에서 가장 넓은 줄 기준으로 모든 group의 width를 통일 → 모든 border-bottom이 동일하게 꽉 차게
    const maxRight = allRights.length ? Math.max(...allRights) : 0;
    allGroups.forEach(group => {
      group.style.width = maxRight + 'px';
    });
  }

  // 마지막 시간(18:00, 19:00 등)도 anchor 위치까지 정렬되도록 half row 끝에 여백 확보
  // anchor 오른쪽으로 남은 공간(clientWidth - anchorRight)만큼 padding-right를 주면
  // 마지막 시간 요소까지 anchor 위치로 스크롤할 수 있게 됨
  function adjustHalfRowEndPadding() {
    const fullHours = scheduleHoursRowFull.querySelectorAll('.schedule-hour');
    if (fullHours.length < 6) return;

    const halfLeft = scheduleHoursRowHalf.getBoundingClientRect().left;
    const anchorRight = fullHours[5].getBoundingClientRect().right - halfLeft; // 6번째 칸 right (컨테이너 기준)
    const padding = scheduleHoursRowHalf.clientWidth - anchorRight;
    scheduleHoursRowHalf.style.paddingRight = Math.max(0, padding) + 'px';
  }

  // 각 라벨의 아래 끝을 대응하는 프로그램 영역의 "마지막 줄(마지막 program-group의 아래 끝)"에 맞춤
  // 라벨은 세로로 쌓이므로 현재 라벨의 실제 top(이전 라벨들이 쌓인 결과)을 빼서 누적을 자동 반영해야
  // 두 번째·세 번째 라벨도 어긋나지 않음 (viewport 기준 절대 좌표로 계산)
  function syncLabelHeights() {
    const labels = document.querySelectorAll('.schedule-section__label');
    scheduleSectionPrograms.forEach((programs, index) => {
      const label = labels[index];
      if (!label) return;

      // 마지막 program-group의 아래 끝(없으면 programs 박스 아래)을 목표로
      const groups = programs.querySelectorAll('.program-group');
      const target = groups.length === 0 ? programs : groups[groups.length - 1];

      const targetBottom = target.getBoundingClientRect().bottom;
      const labelTop = label.getBoundingClientRect().top;
      label.style.height = (targetBottom - labelTop) + 'px';
    });
  }

  // programs 높이가 바뀔 때마다(폰트 로딩, 내용 변경, 리사이즈 등) 라벨 높이 재동기화
  // ResizeObserver는 관찰 시작 시 초기 콜백도 발생시켜 최초 동기화까지 처리함
  const labelHeightObserver = new ResizeObserver(syncLabelHeights);
  scheduleSectionPrograms.forEach(programs => labelHeightObserver.observe(programs));

  // 초기 상태: 첫 번째 시간대 활성화
  if (hourButtons.length > 0) {
    // 약간의 딜레이 후 정렬 (레이아웃이 완전히 계산된 후)
    setTimeout(() => {
      alignProgramsByTime();
      adjustHalfRowEndPadding();

      hourButtons[0].classList.add('schedule-hour--active');
      const firstHour = parseInt(hourButtons[0].textContent.trim().split(':')[0]);
      highlightProgramsByTime(firstHour);
      syncScrolls(firstHour);
    }, 100);
  }

  // 창 크기 변경 시 끝 여백 재계산
  window.addEventListener('resize', adjustHalfRowEndPadding);

  // 스크롤 이벤트 리스너
  scheduleHoursRowFull.addEventListener('scroll', function() {
    if (isScrolling) return;
    isScrolling = true;

    const fullScrollLeft = scheduleHoursRowFull.scrollLeft;
    scheduleHoursRowHalf.scrollLeft = fullScrollLeft;

    const scheduleContents = document.querySelector('.schedule-section__contents');
    if (scheduleContents) {
      scheduleContents.scrollLeft = fullScrollLeft;
    }

    requestAnimationFrame(() => { isScrolling = false; });
  });

  scheduleHoursRowHalf.addEventListener('scroll', function() {
    if (isScrolling) return;
    isScrolling = true;

    const halfScrollLeft = scheduleHoursRowHalf.scrollLeft;
    scheduleHoursRowFull.scrollLeft = halfScrollLeft;

    const scheduleContents = document.querySelector('.schedule-section__contents');
    if (scheduleContents) {
      scheduleContents.scrollLeft = halfScrollLeft;
    }

    requestAnimationFrame(() => { isScrolling = false; });
  });

  // ===== 프로그램 일정/안내 토글 (화면 우측 중앙 고정) =====
  const scheduleToggle = document.querySelector('.schedule-toggle');
  if (scheduleToggle) {
    const toggleItems = scheduleToggle.querySelectorAll('.schedule-toggle__item');
    const sectionSchedule = document.querySelector('.section--schedule');
    const sectionGuide = document.querySelector('.section--guide');

    // 클릭 시 해당 섹션으로 스크롤
    toggleItems.forEach(item => {
      item.addEventListener('click', function() {
        const target = item.dataset.section === 'guide' ? sectionGuide : sectionSchedule;
        if (target) target.scrollIntoView({ behavior: 'smooth' });
      });
    });

    // 스크롤 위치에 따라 active 전환 (guide 섹션이 화면 중앙에 들어오면 '안내')
    function updateToggleActive() {
      if (!sectionGuide) return;
      const isGuide = sectionGuide.getBoundingClientRect().top <= window.innerHeight / 2;
      toggleItems.forEach(item => {
        const active = (item.dataset.section === 'guide') === isGuide;
        item.classList.toggle('schedule-toggle__item--active', active);
      });
    }

    window.addEventListener('scroll', updateToggleActive);
    updateToggleActive();
  }

  // ===== 커스텀 가로 스크롤바 (absolute 오버레이, 손잡이가 트랙 양 끝까지 이동) =====
  const contentsEl = document.querySelector('.schedule-section__contents');
  const cscrollbar = document.querySelector('.cscrollbar');
  const cthumb = document.querySelector('.cscrollbar__thumb');
  const cprogress = document.querySelector('.cscrollbar__progress');

  if (contentsEl && cscrollbar && cthumb && cprogress) {
    function updateCustomScrollbar() {
      const maxScroll = contentsEl.scrollWidth - contentsEl.clientWidth;
      if (maxScroll <= 0) {
        cscrollbar.style.visibility = 'hidden';
        return;
      }
      cscrollbar.style.visibility = '';
      const trackWidth = cscrollbar.clientWidth - cthumb.offsetWidth; // 손잡이 이동 범위
      const thumbLeft = (contentsEl.scrollLeft / maxScroll) * trackWidth;
      cthumb.style.left = thumbLeft + 'px';
      cprogress.style.width = (thumbLeft + cthumb.offsetWidth / 2) + 'px';
    }

    // contents 스크롤 → 손잡이 위치 + 시간 행 동기화
    contentsEl.addEventListener('scroll', function() {
      updateCustomScrollbar();
      if (isScrolling) return;
      isScrolling = true;
      scheduleHoursRowHalf.scrollLeft = contentsEl.scrollLeft;
      scheduleHoursRowFull.scrollLeft = contentsEl.scrollLeft;
      requestAnimationFrame(() => { isScrolling = false; });
    });

    // 손잡이 드래그
    let dragging = false;
    let dragStartX = 0;
    let dragStartScroll = 0;

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

    // 트랙 클릭 시 해당 위치로 이동
    cscrollbar.addEventListener('pointerdown', function(e) {
      if (e.target === cthumb) return;
      const trackWidth = cscrollbar.clientWidth - cthumb.offsetWidth;
      if (trackWidth <= 0) return;
      const clickX = e.clientX - cscrollbar.getBoundingClientRect().left - cthumb.offsetWidth / 2;
      const ratio = Math.max(0, Math.min(1, clickX / trackWidth));
      contentsEl.scrollLeft = ratio * (contentsEl.scrollWidth - contentsEl.clientWidth);
    });

    window.addEventListener('resize', updateCustomScrollbar);
    new ResizeObserver(updateCustomScrollbar).observe(contentsEl);
    setTimeout(updateCustomScrollbar, 150);
  }

  // (program-card 호버/활성 시 아이콘 흰색 처리는 CSS filter로 대체)

  // ===== program-card 클릭 시 상세 인라인 펼침 (아코디언) =====
  const detailModal = document.querySelector('.detail-modal');
  if (detailModal) {
    const modalTag = detailModal.querySelector('.detail-modal__tag');
    const modalTitle = detailModal.querySelector('.detail-modal__title');
    const modalParts = detailModal.querySelector('.detail-modal__parts');
    let activeCard = null;

    // 클릭한 카드 정보를 상세 패널에 채움
    // 자동 입력: 배지(.tag) / 프로그램명(제목)
    // 그 외 상세 내용은 카드의 .program-card__detail에서 HTML로 직접 작성
    function fillDetail(card) {
      const tag = card.querySelector('.tag');
      if (tag && modalTag) {
        modalTag.textContent = tag.textContent;
        const variant = [...tag.classList].find(c => c.startsWith('tag--')) || '';
        modalTag.className = 'tag detail-modal__tag ' + variant;
      }
      const title = card.querySelector('.program-card__title');
      if (title && modalTitle) modalTitle.textContent = title.textContent;

      // 카드별 상세 본문 (HTML에서 직접 작성하는 부분) — 이미지 제외한 본문 전체 주입
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

      // 이미지: 카드 detail의 .program-card__detail-img를 모달 이미지에 반영
      const modalImageImg = detailModal.querySelector('.detail-modal__image img');
      const detailImg = detail ? detail.querySelector('.program-card__detail-img') : null;
      const detailImgSrc = detailImg ? detailImg.getAttribute('src') : '';
      if (modalImageImg && detailImgSrc) {
        modalImageImg.src = detailImgSrc;
        modalImageImg.alt = detailImg.getAttribute('alt') || '';
      }
      // 카드별 이미지 확대/위치(transform) 반영 (없으면 초기화)
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

    function openDetail(card) {
      // 같은 카드 다시 클릭 → 닫기
      if (activeCard === card) {
        closeDetail();
        return;
      }
      closeDetail(); // 기존 열린 카드 정리

      fillDetail(card);
      card.after(detailModal); // 클릭한 카드 바로 다음으로 상세 이동
      card.classList.add('program-card--active');
      activeCard = card;

      // 다음 프레임에 펼침(아래에서 위로 + 슬라이드다운)
      requestAnimationFrame(() => detailModal.classList.add('is-open'));
    }

    document.querySelectorAll('.program-card').forEach(card => {
      card.addEventListener('click', function() { openDetail(card); });
    });
  }

  // ===== 카테고리 탭으로 program-card 필터링 =====
  const categoryTabs = document.querySelectorAll('.category-tabs__item');
  const programCards = document.querySelectorAll('.program-card');
  // 탭 순서: 전체 / 생태설명회 / 공연 / 체험
  const categoryFilters = [null, 'tag--education', 'tag--performance', 'tag--experience'];

  categoryTabs.forEach((tab, index) => {
    tab.addEventListener('click', function() {
      categoryTabs.forEach(t => t.classList.remove('category-tabs__item--active'));
      tab.classList.add('category-tabs__item--active');

      const filter = categoryFilters[index];
      programCards.forEach(card => {
        const show = !filter || card.querySelector('.' + filter);
        card.style.display = show ? '' : 'none';
      });
    });
  });
});
