const ZOOM_MIN = 1;
const ZOOM_MAX = 4;
const ZOOM_STEP = 1.5;

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

function toPersianDigits(value) {
  return String(value).replace(/\d/g, (digit) => PERSIAN_DIGITS[Number(digit)]);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Fullscreen image viewer built on the native <dialog> element.
 * Supports zoom, drag-to-pan, two-finger pinch, keyboard control and focus return.
 */
export function createLightbox(designs) {
  const dialog = document.getElementById('lightbox');
  if (!dialog) {
    return { open() {} };
  }

  const canvas = dialog.querySelector('[data-canvas]');
  const image = dialog.querySelector('[data-image]');
  const titleEl = dialog.querySelector('#lightbox-title');
  const fileLink = dialog.querySelector('[data-file-link]');
  const closeBtn = dialog.querySelector('[data-close]');
  const zoomValueEl = dialog.querySelector('[data-zoom-value]');
  const liveEl = dialog.querySelector('[data-live]');

  let scale = 1;
  let tx = 0;
  let ty = 0;
  let frame = 0;
  let triggerEl = null;
  let announceTimer = 0;

  const pointers = new Map();
  let drag = null;
  let pinch = null;

  function percentLabel(value) {
    return `${toPersianDigits(Math.round(value * 100))}٪`;
  }

  function updateZoomLabel() {
    zoomValueEl.textContent = percentLabel(scale);
  }

  function announce() {
    window.clearTimeout(announceTimer);
    announceTimer = window.setTimeout(() => {
      liveEl.textContent = `بزرگ‌نمایی ${toPersianDigits(Math.round(scale * 100))} درصد`;
    }, 250);
  }

  function clampPan() {
    const canvasWidth = canvas.clientWidth;
    const canvasHeight = canvas.clientHeight;
    const imageWidth = image.offsetWidth || 0;
    const imageHeight = image.offsetHeight || 0;
    const maxX = Math.max(0, (imageWidth * scale - canvasWidth) / 2);
    const maxY = Math.max(0, (imageHeight * scale - canvasHeight) / 2);
    tx = clamp(tx, -maxX, maxX);
    ty = clamp(ty, -maxY, maxY);
  }

  function paint() {
    clampPan();
    image.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`;
    updateZoomLabel();
  }

  function schedulePaint() {
    if (frame) return;
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      paint();
    });
  }

  function setScale(nextScale, origin) {
    const target = clamp(nextScale, ZOOM_MIN, ZOOM_MAX);
    const factor = target / scale;

    if (origin) {
      tx = origin.x - factor * (origin.x - tx);
      ty = origin.y - factor * (origin.y - ty);
    }

    scale = target;

    if (scale === ZOOM_MIN) {
      tx = 0;
      ty = 0;
    }

    schedulePaint();
  }

  function pointFromEvent(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - (rect.left + rect.width / 2),
      y: event.clientY - (rect.top + rect.height / 2),
    };
  }

  function pinchGeometry() {
    const [first, second] = Array.from(pointers.values());
    const rect = canvas.getBoundingClientRect();
    return {
      distance: Math.hypot(first.x - second.x, first.y - second.y) || 1,
      midpoint: {
        x: (first.x + second.x) / 2 - (rect.left + rect.width / 2),
        y: (first.y + second.y) / 2 - (rect.top + rect.height / 2),
      },
    };
  }

  function startPinch() {
    const geometry = pinchGeometry();
    pinch = {
      distance: geometry.distance,
      midpoint: geometry.midpoint,
      scale,
      tx,
      ty,
    };
    drag = null;
  }

  function updatePinch() {
    if (!pinch) return;
    const geometry = pinchGeometry();
    const target = clamp(pinch.scale * (geometry.distance / pinch.distance), ZOOM_MIN, ZOOM_MAX);
    const factor = target / pinch.scale;

    scale = target;
    tx = geometry.midpoint.x - factor * (pinch.midpoint.x - pinch.tx);
    ty = geometry.midpoint.y - factor * (pinch.midpoint.y - pinch.ty);
    schedulePaint();
  }

  function resetTransform() {
    scale = 1;
    tx = 0;
    ty = 0;
    pointers.clear();
    drag = null;
    pinch = null;
    canvas.classList.remove('is-dragging');
    image.style.transform = 'translate3d(0px, 0px, 0px) scale(1)';
    updateZoomLabel();
  }

  function open(designId, trigger) {
    const design = designs[designId];
    if (!design) return;

    resetTransform();
    dialog.dataset.concept = design.concept === 'light' ? 'light' : 'dark';
    titleEl.textContent = design.title;
    image.src = design.src;
    image.alt = design.alt;
    fileLink.href = design.src;
    triggerEl = trigger || null;

    dialog.showModal();
    document.documentElement.classList.add('is-locked');
    closeBtn.focus({ preventScroll: true });
    liveEl.textContent = `تصویر ${design.title} در اندازه اصلی باز شد.`;

    if (image.complete) {
      schedulePaint();
    } else {
      image.addEventListener('load', () => schedulePaint(), { once: true });
    }
  }

  function close() {
    if (dialog.open) dialog.close();
  }

  closeBtn.addEventListener('click', close);

  dialog.addEventListener('close', () => {
    document.documentElement.classList.remove('is-locked');
    image.removeAttribute('src');
    image.alt = '';
    if (triggerEl && typeof triggerEl.focus === 'function') {
      triggerEl.focus({ preventScroll: true });
    }
  });

  /* Zoom buttons */
  dialog.querySelectorAll('[data-zoom]').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.zoom;

      if (action === 'in') {
        setScale(scale * ZOOM_STEP);
      } else if (action === 'out') {
        setScale(scale / ZOOM_STEP);
      } else {
        scale = 1;
        tx = 0;
        ty = 0;
        paint();
      }

      announce();
    });
  });

  /* Wheel zoom */
  canvas.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
      const factor = Math.exp(-event.deltaY * 0.0016);
      setScale(scale * factor, pointFromEvent(event));
      announce();
    },
    { passive: false }
  );

  /* Double click toggles zoom around the pointer */
  canvas.addEventListener('dblclick', (event) => {
    event.preventDefault();
    setScale(scale > 1.01 ? 1 : 2.5, pointFromEvent(event));
    announce();
  });

  /* Pointer drag & pinch */
  canvas.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    canvas.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.size === 1) {
      drag = { x: event.clientX, y: event.clientY, tx, ty };
      pinch = null;
      canvas.classList.add('is-dragging');
    } else if (pointers.size === 2) {
      startPinch();
      canvas.classList.add('is-dragging');
    }
  });

  canvas.addEventListener('pointermove', (event) => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.size >= 2) {
      updatePinch();
      return;
    }

    if (!drag) return;
    tx = drag.tx + (event.clientX - drag.x);
    ty = drag.ty + (event.clientY - drag.y);
    schedulePaint();
  });

  function endPointer(event) {
    if (!pointers.has(event.pointerId)) return;
    pointers.delete(event.pointerId);

    if (pointers.size === 1) {
      const remaining = Array.from(pointers.values())[0];
      drag = { x: remaining.x, y: remaining.y, tx, ty };
      pinch = null;
      announce();
    } else if (pointers.size === 0) {
      drag = null;
      pinch = null;
      canvas.classList.remove('is-dragging');
      announce();
    }
  }

  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);

  /* Keyboard support inside the viewer */
  dialog.addEventListener('keydown', (event) => {
    const focusable = [
      // The dialog itself participates so focus never leaves the modal.
      ...(dialog.getAttribute('tabindex') === '-1' ? [dialog] : []),
      ...Array.from(
        dialog.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')
      ).filter((element) => element.offsetParent !== null),
    ];

    if (event.key === 'Tab') {
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
      return;
    }

    if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      setScale(scale * ZOOM_STEP);
      announce();
    } else if (event.key === '-' || event.key === '_') {
      event.preventDefault();
      setScale(scale / ZOOM_STEP);
      announce();
    } else if (event.key === '0') {
      event.preventDefault();
      scale = 1;
      tx = 0;
      ty = 0;
      paint();
      announce();
    } else if (event.key.startsWith('Arrow')) {
      event.preventDefault();
      const step = 60;
      if (event.key === 'ArrowLeft') tx += step;
      if (event.key === 'ArrowRight') tx -= step;
      if (event.key === 'ArrowUp') ty += step;
      if (event.key === 'ArrowDown') ty -= step;
      schedulePaint();
    }
  });

  window.addEventListener('resize', () => {
    if (!dialog.open) return;
    schedulePaint();
  });

  return { open };
}
