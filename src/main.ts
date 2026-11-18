import './styles.scss';
import { createBookmarkStore } from './bookmarks/store';
import { initBookmarks } from './bookmarks/view';
import { createToast, element } from './dom';
import { initPin } from './pin/view';
import { initReorder } from './reorder/view';
import { initSettings } from './settings/view';
import { createNavigation } from './views';
import type { ViewName } from './views';

const notify = createToast();
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

const settings = initSettings(pin);
const navigation = createNavigation({
  bookmarks: initBookmarks({ store, pin, notify }),
  reorder: initReorder(store),
  settings,
  pin: pin.view,
});

element('settingsButton', 'button').addEventListener('click', () => navigation.show('settings'));
element('reorderButton', 'button').addEventListener('click', () => navigation.show('reorder'));
element('doneReorderButton', 'button').addEventListener('click', () => navigation.show('bookmarks'));
element('backFromSettings', 'button').addEventListener('click', () => navigation.show('bookmarks'));
settings.root.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') navigation.show('bookmarks');
});

if (pin.enabled) pin.lock();
else navigation.show('bookmarks');
