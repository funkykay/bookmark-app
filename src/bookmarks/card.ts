import { hostname } from './model';
import type { Bookmark } from './model';

const tiles = [
  ['#e8efff', '#4265c9'], ['#e3f3ee', '#20846d'], ['#ffecdf', '#b66a31'],
  ['#f0e8fa', '#8252aa'], ['#fce7ec', '#bd526f'], ['#e6f1f7', '#417e9d'],
] as const;

export function createBookmarkCard(bookmark: Bookmark, content: HTMLAnchorElement | HTMLDivElement, action: HTMLButtonElement): HTMLLIElement {
  const { id, name, url } = bookmark;
  const domain = hostname(url);
  const card = document.createElement('li');
  card.className = 'bookmark';
  card.dataset.bookmarkId = id;

  content.className = 'bookmark-content';
  if (content instanceof HTMLAnchorElement) {
    content.href = url;
    content.title = url;
    content.setAttribute('aria-label', `${name} öffnen`);
  }

  const glyph = document.createElement('span');
  glyph.className = 'glyph';
  glyph.textContent = (name.charAt(0) || '?').toLocaleUpperCase('de');
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
  content.append(glyph, detail);

  card.append(content, action);
  return card;
}
