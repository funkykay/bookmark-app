import { currentLanguage } from '../i18n';
import type { Label } from '../bookmarks/model';

export function labelBadge(label: Pick<Label, 'name' | 'color'>): HTMLSpanElement {
  const badge = document.createElement('span');
  badge.className = 'bookmark-label';
  badge.style.setProperty('--label-color', label.color);
  badge.textContent = label.name;
  badge.title = label.name;
  return badge;
}

export function sortedLabels(labels: readonly Label[]): Label[] {
  const collator = new Intl.Collator(currentLanguage());
  return [...labels].sort((a, b) => collator.compare(a.name, b.name));
}
