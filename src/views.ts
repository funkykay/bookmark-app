export type ViewName = 'bookmarks' | 'labels' | 'reorder' | 'settings' | 'pin';

export interface View {
  root: HTMLElement;
  render?: () => void;
  leave?: () => void;
}

export function createNavigation(views: Record<ViewName, View>) {
  let current: ViewName | undefined;

  return {
    get current() { return current; },
    show(next: ViewName) {
      if (current === next) return;
      const isViewChange = current !== undefined;
      if (current) {
        views[current].leave?.();
        views[current].root.hidden = true;
      }
      current = next;
      const view = views[next];
      view.render?.();
      view.root.hidden = false;
      if (isViewChange) view.root.querySelector('h1')?.focus();
    },
    refresh() {
      if (current) views[current].render?.();
    },
  };
}
