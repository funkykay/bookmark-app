import { element } from '../dom';
import { legalMessages, messages } from '../i18n';
import type { View } from '../views';

const paths = { imprint: '/impressum', privacy: '/datenschutz' } as const;

export function legacyLegalUrl(): URL | undefined {
  const url = new URL(location.href);
  const page = url.searchParams.get('seite');
  const path = Object.values(paths).find(path => path.slice(1) === page);
  if (!path) return;
  url.searchParams.delete('seite');
  url.hash = path;
  return url;
}

export function initLegalViews() {
  const root = element('legalView', 'main');
  const heading = element('legalTitle', 'h1');
  const role = element('operatorRole', 'h2');
  const content = element('privacyContent', 'div');

  function page(name: keyof typeof paths): View {
    return {
      path: paths[name],
      public: true,
      root,
      render() {
        const legal = legalMessages();
        heading.textContent = legal[name];
        document.title = `${legal[name]} · ${messages().bookmarks}`;
        role.textContent = name === 'privacy' ? legal.controller : legal.provider;
        content.hidden = name !== 'privacy';
      },
      leave() { document.title = messages().bookmarks; },
    };
  }

  return { imprint: page('imprint'), privacy: page('privacy') };
}
