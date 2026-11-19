import './styles.scss';
import { createBookmarkStore } from './bookmarks/store';
import { initBookmarks } from './bookmarks/view';
import { createToast, element } from './dom';
import { initLabels } from './labels/view';
import { initPin } from './pin/view';
import { initReorder } from './reorder/view';
import { initLanguage } from './settings/language';
import { initSettings } from './settings/view';
import { createNavigation } from './views';
import type { ViewName } from './views';

const notify = createToast();
const clearLanguage = initLanguage(notify);
const store = createBookmarkStore(notify, () => navigation.refresh());
let previousView: Exclude<ViewName, 'pin'> = 'bookmarks';
const pin = initPin({
  notify,
  showPin() {
    const current = navigation.current;
    if (current && current !== 'pin') previousView = current;
    navigation.show('pin');
  },
  returnFromPin() { navigation.show(previousView); },
});

const settings = initSettings({ store, pin, notify, clearLanguage });
const navigation = createNavigation({
  bookmarks: initBookmarks({ store, pin }),
  reorder: initReorder(store),
  labels: initLabels(store),
  settings,
  pin: pin.view,
});

element('labelsButton', 'button').addEventListener('click', () => navigation.show('labels'));
element('backFromLabels', 'button').addEventListener('click', () => navigation.show('bookmarks'));
element('settingsButton', 'button').addEventListener('click', () => navigation.show('settings'));
element('reorderButton', 'button').addEventListener('click', () => navigation.show('reorder'));
element('doneReorderButton', 'button').addEventListener('click', () => navigation.show('bookmarks'));
element('backFromSettings', 'button').addEventListener('click', () => navigation.show('bookmarks'));
settings.root.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') navigation.show('bookmarks');
});

if (pin.enabled) pin.lock();
else navigation.show('bookmarks');
