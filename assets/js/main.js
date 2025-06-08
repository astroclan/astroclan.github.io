const images = document.querySelectorAll('img');
const overlay = document.createElement('div');
const popupImg = document.createElement('img');

overlay.style.cssText = `
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.8);
  display: none;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  transition: background-color 0.3s ease;
`;

popupImg.style.cssText = `
  position: fixed;
  max-width: 90vw;
  max-height: 90vh;
  touch-action: none;
  pointer-events: none;
  will-change: transform, border-radius;
  object-fit: cover;
`;

overlay.appendChild(popupImg);
document.body.appendChild(overlay);

let originImg = null;
let startX = 0,
  startY = 0;
let isDragging = false;
let originalRect = null;
const MIN_SIZE = 50; // Minimum size in pixels

function getTransforms(fromRect, targetW, targetH) {
  const scaleX = fromRect.width / targetW;
  const scaleY = fromRect.height / targetH;
  const translateX = fromRect.left + fromRect.width / 2 - window.innerWidth / 2;
  const translateY = fromRect.top + fromRect.height / 2 - window.innerHeight / 2;
  return {
    scaleX,
    scaleY,
    translateX,
    translateY
  };
}

images.forEach(img => {
  img.style.cursor = 'zoom-in';
  img.addEventListener('click', () => {
    originImg = img;
    const rect = img.getBoundingClientRect();
    originalRect = rect;

    popupImg.src = img.src;

    // Fully reset styles before each open
    popupImg.style.removeProperty('width');
    popupImg.style.removeProperty('height');
    popupImg.style.removeProperty('aspect-ratio');
    popupImg.style.transition = 'none';
    popupImg.style.transform = '';
    popupImg.style.borderRadius = '';
    popupImg.style.pointerEvents = 'none';

    popupImg.onload = () => {
      popupImg.offsetWidth; // Force reflow

      const naturalW = popupImg.naturalWidth;
      const naturalH = popupImg.naturalHeight;
      const aspectRatio = naturalW / naturalH;
      const maxW = window.innerWidth * 0.9;
      const maxH = window.innerHeight * 0.9;
      let finalW, finalH;

      if (maxW / maxH > aspectRatio) {
        finalH = maxH;
        finalW = finalH * aspectRatio;
      } else {
        finalW = maxW;
        finalH = finalW / aspectRatio;
      }

      const {
        scaleX,
        scaleY,
        translateX,
        translateY
      } = getTransforms(rect, finalW, finalH);

      // Set initial size and show
      popupImg.style.width = `${finalW}px`;
      popupImg.style.height = `${finalH}px`;
      overlay.style.display = 'flex';

      requestAnimationFrame(() => {
        popupImg.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`;

        requestAnimationFrame(() => {
          popupImg.style.transition = 'transform 0.4s ease, border-radius 0.4s ease';
          popupImg.style.transform = `translate(0, 0) scale(1)`;
          popupImg.style.borderRadius = '12px';
          popupImg.style.pointerEvents = 'auto';
        });
      });
    };
  });
});

function closePopup() {
  if (!originImg || !originalRect) return;

  const finalW = parseFloat(popupImg.style.width);
  const finalH = parseFloat(popupImg.style.height);
  const {
    scaleX,
    scaleY,
    translateX,
    translateY
  } = getTransforms(originalRect, finalW, finalH);

  // Start the transition for the image back to origin
  popupImg.style.transition = 'transform 0.35s ease, border-radius 0.35s ease';
  popupImg.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`;
  popupImg.style.borderRadius = '50%';

  // Start fading out overlay bg smoothly
  overlay.style.transition = 'background-color 0.35s ease';
  overlay.style.backgroundColor = 'rgba(0,0,0,0)';

  // Use a named function to clean up after animation ends
  function onTransitionEnd(e) {
    // Ensure this is the transform transition on popupImg (ignore others)
    if (e.target === popupImg && e.propertyName === 'transform') {
      overlay.style.display = 'none';

      // Reset styles exactly here, after transition ends
      popupImg.style.cssText = `
        position: fixed;
        max-width: 90vw;
        max-height: 90vh;
        touch-action: none;
        pointer-events: none;
        will-change: transform, border-radius;
        object-fit: cover;
      `;

      overlay.style.transition = '';
      overlay.style.backgroundColor = 'rgba(0,0,0,0.8)';

      popupImg.removeEventListener('transitionend', onTransitionEnd);
    }
  }

  popupImg.addEventListener('transitionend', onTransitionEnd);
}

// Handle tap outside popup image
overlay.addEventListener('click', e => {
  if (e.target === overlay) closePopup();
});


popupImg.addEventListener('pointerdown', e => {
  isDragging = true;
  startX = e.clientX;
  startY = e.clientY;
  popupImg.setPointerCapture(e.pointerId);

  // Lock square dimensions for drag
  const side = Math.min(popupImg.offsetWidth, popupImg.offsetHeight);
  popupImg.style.width = `${side}px`;
  popupImg.style.height = `${side}px`;
  popupImg.style.aspectRatio = '1 / 1';
});

popupImg.addEventListener('pointermove', e => {
  if (!isDragging) return;

  const deltaX = e.clientX - startX;
  const deltaY = e.clientY - startY;
  const distance = Math.sqrt(deltaX ** 2 + deltaY ** 2);

  const baseSize = parseFloat(popupImg.style.width);
  const minScale = MIN_SIZE / baseSize;
  const shrinkAmount = Math.min(distance / (window.innerHeight * 0.5), 1);
  const scale = Math.max(minScale, 1 - shrinkAmount);

  popupImg.style.transition = 'none';
  popupImg.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(${scale})`;
  popupImg.style.borderRadius = '25%';
  overlay.style.backgroundColor = `rgba(0,0,0,${0.8 * scale})`;
});

popupImg.addEventListener('pointerup', e => {
  if (!isDragging) return;
  isDragging = false;

  const deltaX = e.clientX - startX;
  const deltaY = e.clientY - startY;
  const distance = Math.sqrt(deltaX ** 2 + deltaY ** 2);

  if (distance > 100) {
    closePopup();
  } else {
    popupImg.style.transition = 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1), border-radius 0.4s ease';
    popupImg.style.transform = 'translate(0px, 0px) scale(1)';
    popupImg.style.borderRadius = '12px';
    overlay.style.transition = 'background-color 0.5s ease';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.8)';

    // Clear transition after it's done
    popupImg.addEventListener('transitionend', () => {
      popupImg.style.transition = '';
    }, { once: true });
  }
});
