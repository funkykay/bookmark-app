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
  content: HTMLAnchorElement | HTMLDivElement, action: HTMLButtonElement, updatedDate?: string,
): HTMLLIElement {
  const { id, name, url } = bookmark;
  const domain = hostname(url);
  const card = document.createElement('li');
  card.className = 'bookmark';
  card.dataset.bookmarkId = id;

  content.className = 'bookmark-content';
  if (content instanceof HTMLAnchorElement) {
    content.href = url;
    content.title = url;
    content.setAttribute('aria-label', messages().openNamed(name));
  }

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
  const metadata = document.createElement('span');
  metadata.className = 'bookmark-meta';
  metadata.append(subtitle);
  if (updatedDate) {
    const time = document.createElement('time');
    time.dateTime = bookmark.updated;
    time.textContent = updatedDate;
    time.title = `${messages().lastUpdated}: ${updatedDate}`;
    time.id = `updated-${id}`;
    metadata.append(time);
    content.setAttribute('aria-describedby', time.id);
  }
  detail.append(title, metadata);
  if (bookmark.labelIds.length) {
    const badges = document.createElement('span');
    badges.className = 'label-badges';
    for (const labelId of bookmark.labelIds) {
      const label = labels.get(labelId);
      if (label) badges.append(labelBadge(label));
    }
    detail.append(badges);
    if (content instanceof HTMLAnchorElement) {
      badges.id = `labels-${id}`;
      content.setAttribute('aria-describedby', [badges.id, updatedDate && `updated-${id}`].filter(Boolean).join(' '));
    }
  }
  content.append(glyph, detail);

  card.append(content, action);
  return card;
}
