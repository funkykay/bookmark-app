import './styles.scss';
import { initBookmarks } from './bookmarks/view';
import { createToast, element } from './dom';
import { initPin } from './pin/view';

const app = element('mainApp', 'main');
const menu = element('popup', 'div');
const menuButton = element('menuButton', 'button');
const notify = createToast();

function showMenu(open: boolean): void {
  menu.hidden = !open;
  menuButton.setAttribute('aria-expanded', String(open));
}

function closeMenu(): void {
  showMenu(false);
}

menuButton.addEventListener('click', () => showMenu(menu.hasAttribute('hidden')));
document.addEventListener('click', (event) => {
  if (event.target instanceof Node && !menu.contains(event.target) && !menuButton.contains(event.target)) {
    closeMenu();
  }
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !menu.hidden) {
    closeMenu();
    menuButton.focus();
  }
});

const suspendBookmarks = initBookmarks({ closeMenu, notify });

initPin({
  closeMenu,
  notify,
  setAppHidden(hidden) {
    if (hidden) suspendBookmarks();
    app.hidden = hidden;
  },
});
