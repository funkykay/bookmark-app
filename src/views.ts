import { element } from './dom';

export type ViewName = 'bookmarks' | 'labels' | 'settings' | 'pin';

export interface View {
  root: HTMLElement;
  render?: () => void;
  leave?: () => void;
}

export function createNavigation(views: Record<ViewName, View>) {
  let current: ViewName | undefined;
  const desktopNav = element('desktopNav', 'nav');
  const desktopAdd = element('desktopAdd', 'button');
  const destinations = desktopNav.querySelectorAll<HTMLButtonElement>('button[data-view]');

  for (const button of document.querySelectorAll<HTMLButtonElement>('button[data-view]')) {
    const next = button.dataset.view as ViewName;
    button.addEventListener('click', () => show(next));
  }

  function show(next: ViewName) {
    if (current === next) return;
    const isViewChange = current !== undefined;
    if (current) {
      views[current].leave?.();
      views[current].root.hidden = true;
    }
    current = next;
    desktopNav.hidden = next === 'pin';
    desktopAdd.hidden = next !== 'bookmarks';
    for (const button of destinations) {
      if (button.dataset.view === next) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    }
    const view = views[next];
    view.render?.();
    view.root.hidden = false;
    if (isViewChange) view.root.querySelector('h1')?.focus();
  }

  return {
    get current() { return current; },
    show,
    refresh() {
      if (current) views[current].render?.();
    },
  };
}
