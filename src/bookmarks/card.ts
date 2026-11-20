import { currentLanguage, messages } from '../i18n';
import type { Language } from '../i18n';
import { hostname } from './model';
import { labelBadge } from '../labels/display';
import type { Bookmark, Label } from './model';

const tiles = [
  ['#e8efff', '#4265c9'], ['#e3f3ee', '#20846d'], ['#ffecdf', '#b66a31'],
  ['#f0e8fa', '#8252aa'], ['#fce7ec', '#bd526f'], ['#e6f1f7', '#417e9d'],
] as const;

export function createBookmarkCard(id: string, onEdit: (id: string) => void) {
  const card = document.createElement('li');
  card.className = 'bookmark';

  const content = document.createElement('a');
  content.className = 'bookmark-content';
  const glyph = document.createElement('span');
  glyph.className = 'glyph';
  const detail = document.createElement('span');
  detail.className = 'bookmark-title';
  const title = document.createElement('span');
  title.className = 'name';
  const subtitle = document.createElement('span');
  subtitle.className = 'domain';
  const badges = document.createElement('span');
  badges.className = 'label-badges';
  badges.id = `labels-${id}`;
  detail.append(title, subtitle, badges);
  content.append(glyph, detail);

  const action = document.createElement('button');
  action.type = 'button';
  action.className = 'edit';
  action.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>';
  action.addEventListener('click', () => onEdit(id));
  card.append(content, action);

  let bookmark: Bookmark | undefined;
  let language: Language | undefined;
  let displayedLabels: readonly Label[] = [];

  function updateLabels(ids: readonly string[], labels: ReadonlyMap<string, Label>) {
    const labelsChanged = ids.length !== displayedLabels.length || ids.some((id, index) => {
      const label = labels.get(id)!;
      const previous = displayedLabels[index];
      return previous?.id !== id || previous.name !== label.name || previous.color !== label.color;
    });
    if (labelsChanged) {
      displayedLabels = ids.map(id => labels.get(id)!);
      badges.replaceChildren(...displayedLabels.map(labelBadge));
      if (displayedLabels.length) content.setAttribute('aria-describedby', badges.id);
      else content.removeAttribute('aria-describedby');
    }
  }

  return {
    element: card,
    update(next: Bookmark, labels: ReadonlyMap<string, Label>) {
      const locale = currentLanguage();
      if (language !== locale || bookmark?.name !== next.name) {
        title.textContent = next.name;
        glyph.textContent = (next.name.charAt(0) || '?').toLocaleUpperCase(locale);
        content.setAttribute('aria-label', messages().openNamed(next.name));
        action.setAttribute('aria-label', messages().editNamed(next.name));
      }
      if (bookmark?.url !== next.url) {
        content.href = next.url;
        content.title = next.url;
        const domain = hostname(next.url);
        subtitle.textContent = domain;
        const colorIndex = [...domain].reduce((sum, char) => sum + char.charCodeAt(0), 0) % tiles.length;
        const [background, foreground] = tiles[colorIndex] ?? tiles[0];
        glyph.style.setProperty('--tile-bg', background);
        glyph.style.setProperty('--tile-fg', foreground);
      }
      updateLabels(next.labelIds, labels);
      bookmark = next;
      language = locale;
    },
  };
}
