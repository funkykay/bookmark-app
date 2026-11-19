import { messages } from '../i18n';

const defaultBreakpoint = 960;
const pixelsPerStep = 12;
const snapDistance = 2;

export function initLayout(slider: HTMLInputElement) {
  const minimum = Number(slider.min);
  const maximum = Number(slider.max);
  const middle = Number(slider.defaultValue);
  let position = middle;
  let usingPointer = false;

  function applyLayout() {
    const breakpoint = defaultBreakpoint + (position - middle) * pixelsPerStep;
    const mobile = position === maximum || (position !== minimum && window.innerWidth < breakpoint);
    document.documentElement.dataset.layout = mobile ? 'mobile' : 'desktop';
  }

  function describe(value: number) {
    const key = value === minimum ? 'alwaysDesktop' : value === maximum ? 'alwaysMobile'
      : value === middle ? 'defaultWidth' : value < middle ? 'narrowMobile' : 'wideMobile';
    slider.dataset.i18nAriaValuetext = key;
    slider.setAttribute('aria-valuetext', messages()[key]);
  }

  slider.addEventListener('pointerdown', () => { usingPointer = true; });
  slider.addEventListener('keydown', () => { usingPointer = false; });
  slider.addEventListener('blur', () => { usingPointer = false; });
  slider.addEventListener('input', () => {
    if (usingPointer) {
      const anchor = [minimum, middle, maximum].find(point => Math.abs(slider.valueAsNumber - point) <= snapDistance);
      if (anchor !== undefined) slider.valueAsNumber = anchor;
    }
    describe(slider.valueAsNumber);
  });
  window.addEventListener('resize', applyLayout);

  // Commit on release so the layout cannot move the track underneath the pointer.
  return function setPosition(value: unknown) {
    position = typeof value === 'number' && Number.isInteger(value) && value >= minimum && value <= maximum
      ? value : middle;
    slider.valueAsNumber = position;
    describe(position);
    applyLayout();
  };
}
