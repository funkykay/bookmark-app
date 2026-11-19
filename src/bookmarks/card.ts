import { currentLanguage, messages } from '../i18n';
import { hostname } from './model';
import { labelBadge } from '../labels/display';
import type { Bookmark, Label } from './model';

const tiles = [
  ['#e8efff', '#4265c9'], ['#e3f3ee', '#20846d'], ['#ffecdf', '#b66a31'],
  ['#f0e8fa', '#8252aa'], ['#fce7ec', '#bd526f'], ['#e6f1f7', '#417e9d'],
] as const;

export function createBookmarkCard(
  bookmark: Bookmark, labels: ReadonlyMap<string, Label>,
  openEditor: (bookmark: Bookmark) => void,
): HTMLLIElement {
  const { id, name, url } = bookmark;
  const domain = hostname(url);
  const card = document.createElement('li');
  card.className = 'bookmark';

  const content = document.createElement('a');
  content.className = 'bookmark-content';
  content.href = url;
  content.title = url;
  content.setAttribute('aria-label', messages().openNamed(name));

  const glyph = document.createElement('span');
  glyph.className = 'glyph';
  glyph.textContent = (name.charAt(0) || '?').toLocaleUpperCase(currentLanguage());
  const colorIndex = [...domain].reduce((sum, char) => sum + char.charCodeAt(0), 0) % tiles.length;
  const [background, foreground] = tiles[colorIndex] ?? tiles[0];
  glyph.style.setProperty('--tile-bg', background);
  glyph.style.setProperty('--tile-fg', foreground);

  const detail = document.createElement('span');
  detail.className = 'bookmark-title';
  const title = document.createElement('span');
  title.className = 'name';
  title.textContent = name;
  const subtitle = document.createElement('span');
  subtitle.className = 'domain';
  subtitle.textContent = domain;
  detail.append(title, subtitle);
  if (bookmark.labelIds.length) {
    const badges = document.createElement('span');
    badges.className = 'label-badges';
    for (const labelId of bookmark.labelIds) {
      const label = labels.get(labelId);
      if (label) badges.append(labelBadge(label));
    }
    detail.append(badges);
    badges.id = `labels-${id}`;
    content.setAttribute('aria-describedby', badges.id);
  }
  content.append(glyph, detail);

  const action = document.createElement('button');
  action.type = 'button';
  action.className = 'edit';
  action.setAttribute('aria-label', messages().editNamed(bookmark.name));
  action.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>';
  action.addEventListener('click', () => openEditor(bookmark));
  card.append(content, action);
  return card;
}
