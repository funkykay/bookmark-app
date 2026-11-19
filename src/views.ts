import { element } from './dom';

export interface View {
  readonly path: `/${string}`;
  readonly public?: boolean;
  root: HTMLElement;
  render?: () => void;
  leave?: () => void;
}

type Registry = Record<'bookmarks' | 'labels' | 'settings' | 'pin', View>
  & Partial<Record<'imprint' | 'privacy', View>>;

export function createNavigation(views: Registry, pinActive: () => boolean) {
  let current: View | undefined;
  const byPath = new Map<string, View>(Object.values(views).map(view => [view.path, view]));
  const desktopNav = element('desktopNav', 'nav');
  const desktopAdd = element('desktopAdd', 'button');
  const controls = document.querySelectorAll<HTMLButtonElement | HTMLAnchorElement>('[data-view]');

  for (const control of controls) {
    const name = control.dataset.view as keyof Registry;
    const view = views[name];
    if (!view) throw new Error(`Unbekannte Ansicht: ${name}`);
    if (control instanceof HTMLAnchorElement) control.href = `#${view.path}`;
    else control.addEventListener('click', () => show(name));
  }

  function render(next: View) {
    if (current === next) return;
    const isViewChange = current !== undefined;
    if (current) {
      current.leave?.();
      current.root.hidden = true;
    }
    current = next;
    desktopNav.hidden = next === views.pin || next.public === true;
    desktopAdd.hidden = next !== views.bookmarks;
    for (const control of controls) {
      if (views[control.dataset.view as keyof Registry] === next) control.setAttribute('aria-current', 'page');
      else control.removeAttribute('aria-current');
    }
    next.render?.();
    next.root.hidden = false;
    if (isViewChange) next.root.querySelector('h1')?.focus();
  }

  function syncFromUrl() {
    let destination = byPath.get(location.hash.slice(1));
    // The PIN gate temporarily occupies the requested view's history entry.
    if (destination === views.pin) destination = byPath.get(history.state?.returnPath);
    if (!destination || destination === views.pin) destination = views.bookmarks;

    const next = pinActive() && !destination.public ? views.pin : destination;
    const hash = `#${next.path}`;
    if (location.hash !== hash) {
      const state = next === views.pin ? { returnPath: destination.path } : null;
      history.replaceState(state, '', hash);
    }
    render(next);
  }

  function show(name: keyof Registry) {
    const next = views[name];
    if (!next || next === views.pin || current === next) return;
    history.pushState(null, '', `#${next.path}`);
    syncFromUrl();
  }

  window.addEventListener('hashchange', syncFromUrl);

  return {
    show,
    syncFromUrl,
    refresh() { current?.render?.(); },
  };
}
