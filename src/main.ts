import './styles.scss';
import { messages } from './i18n';
import { createBookmarkStore } from './bookmarks/store';
import { initBookmarks } from './bookmarks/view';
import { createToast } from './dom';
import { initLabels } from './labels/view';
import { initPin } from './pin/view';
import { initLegalViews, legacyLegalUrl } from './legal/views';
import { initLanguage } from './settings/language';
import { initSettings } from './settings/view';
import { createNavigation } from './views';

const notify = createToast();
const clearLanguage = initLanguage(notify);

const legacyUrl = __LEGAL_PAGES__ && legacyLegalUrl();
if (legacyUrl) location.replace(legacyUrl);
else startApp();

function startApp() {
  const store = createBookmarkStore(issue => notify(messages()[issue]), () => navigation.refresh());
  const pin = initPin({
    notify,
    onGateChange() { navigation.syncFromUrl(); },
  });

  const settings = initSettings({ store, pin, notify, clearLanguage });
  const navigation = createNavigation({
    bookmarks: initBookmarks({ store, pin }),
    labels: initLabels(store),
    settings,
    pin: pin.view,
    ...(__LEGAL_PAGES__ ? initLegalViews() : {}),
  }, () => pin.active);

  settings.root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') navigation.show('bookmarks');
  });

  if (pin.enabled) pin.lock();
  else navigation.syncFromUrl();
}
