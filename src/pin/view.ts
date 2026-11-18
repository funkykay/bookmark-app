import { element } from '../dom';
import { createPinSettings, loadPinSettings, matchesPin, savePinSettings } from './model';
import type { PinSettings } from './model';

type Purpose = 'enable' | 'change';
type Gate =
  | { mode: 'unlock' | 'verify-disable' | 'verify-change' }
  | { mode: 'create'; purpose: Purpose }
  | { mode: 'confirm'; purpose: Purpose; firstPin: string };

const gateText = {
  unlock: ['Entsperren', '6-stellige PIN eingeben'],
  'verify-disable': ['PIN-Schutz ausschalten', 'Aktuelle PIN eingeben'],
  'verify-change': ['PIN ändern', 'Aktuelle PIN eingeben'],
  create: ['PIN festlegen', 'Neue 6-stellige PIN'],
  confirm: ['PIN bestätigen', 'PIN erneut eingeben'],
} as const;

const lockDuration = 60 * 60 * 1000;

interface Options {
  closeMenu: () => void;
  notify: (message: string) => void;
  setAppHidden: (hidden: boolean) => void;
}

export function initPin({ closeMenu, notify, setAppHidden }: Options): void {
  const dialog = element('securityDialog', 'dialog');
  const pinSwitch = element('pinSwitch', 'button');
  const changeButton = element('changePinButton', 'button');
  const lockButton = element('lockButton', 'button');
  const gateElement = element('pinGate', 'section');
  const title = element('pinTitle', 'h2');
  const hint = element('pinHint', 'p');
  const dots = element('pinDots', 'div');
  const feedback = element('pinFeedback', 'p');
  const countdown = element('pinCountdown', 'div');
  const keypad = element('pinKeypad', 'div');
  const cancelButton = element('pinCancel', 'button');

  let settings = loadPinSettings();
  let gate: Gate | null = null;
  let buffer = '';
  let error = '';
  let busy = false;

  function refreshSecurityMenu(): void {
    lockButton.hidden = !settings;
    changeButton.hidden = !settings;
    pinSwitch.setAttribute('aria-checked', String(Boolean(settings)));
  }

  function persist(next: PinSettings | null): boolean {
    try {
      savePinSettings(next);
    } catch {
      notify('PIN-Schutz konnte nicht gespeichert werden.');
      return false;
    }
    settings = next;
    return true;
  }

  function isVerifying(): boolean {
    return gate !== null && gate.mode !== 'create' && gate.mode !== 'confirm';
  }

  function secondsUntilUnlock(): number {
    return settings && isVerifying() ? Math.max(0, Math.ceil((settings.lockUntil - Date.now()) / 1000)) : 0;
  }

  function renderGate(): void {
    if (!gate) return;
    const seconds = secondsUntilUnlock();
    const locked = seconds > 0;
    const [heading, instruction] = gateText[gate.mode];
    title.textContent = locked ? 'Gesperrt' : heading;
    hint.textContent = locked ? 'Erneut versuchen in' : instruction;
    keypad.hidden = locked;
    dots.hidden = locked;
    countdown.hidden = !locked;
    cancelButton.hidden = gate.mode === 'unlock';
    if (locked) {
      const parts = [Math.floor(seconds / 3600), Math.floor((seconds % 3600) / 60), seconds % 60];
      countdown.textContent = parts.map((part) => String(part).padStart(2, '0')).join(':');
    }
    feedback.textContent = locked ? '' : error;
    dots.setAttribute('aria-label', `${buffer.length} von 6 Ziffern eingegeben`);
    Array.from(dots.children).forEach((dot, index) => dot.toggleAttribute('data-filled', index < buffer.length));
  }

  function goTo(next: Gate, message = ''): void {
    gate = next;
    buffer = '';
    error = message;
    busy = false;
    renderGate();
    title.focus();
  }

  function openGate(next: Gate): void {
    dialog.close();
    closeMenu();
    setAppHidden(true);
    gateElement.hidden = false;
    goTo(next);
  }

  function closeGate(): void {
    gate = null;
    buffer = '';
    error = '';
    busy = false;
    gateElement.hidden = true;
    setAppHidden(false);
    refreshSecurityMenu();
    element('menuButton', 'button').focus();
  }

  function registerFailure(previous: PinSettings): void {
    const attempts = previous.attempts + 1;
    const locked = attempts >= 3;
    settings = { ...previous, attempts: locked ? 0 : attempts, lockUntil: locked ? Date.now() + lockDuration : 0 };
    persist(settings);
    if (locked) {
      goTo({ mode: 'unlock' });
      return;
    }
    const remaining = 3 - attempts;
    error = `Falsche PIN · Noch ${remaining} ${remaining === 1 ? 'Versuch' : 'Versuche'}`;
  }

  async function completePin(current: Gate, pin: string): Promise<void> {
    if (current.mode === 'create') {
      goTo({ mode: 'confirm', purpose: current.purpose, firstPin: pin });
      return;
    }

    try {
      if (current.mode === 'confirm') {
        if (current.firstPin !== pin) {
          goTo({ mode: 'create', purpose: current.purpose }, 'PINs stimmen nicht überein');
          return;
        }
        const next = await createPinSettings(pin);
        if (gate !== current) return;
        if (persist(next)) {
          closeGate();
          notify(current.purpose === 'change' ? 'PIN geändert' : 'PIN-Schutz aktiviert');
        } else {
          goTo({ mode: 'create', purpose: current.purpose }, 'Speichern nicht möglich');
        }
        return;
      }

      const previous = settings;
      if (!previous) return;
      const correct = await matchesPin(pin, previous);
      if (gate !== current) return;
      if (!correct) {
        registerFailure(previous);
      } else if (current.mode === 'verify-disable') {
        if (persist(null)) {
          closeGate();
          notify('PIN-Schutz deaktiviert');
        } else {
          error = 'Deaktivieren fehlgeschlagen';
        }
      } else {
        if (settings?.attempts || settings?.lockUntil) {
          settings = { ...previous, attempts: 0, lockUntil: 0 };
          persist(settings);
        }
        if (current.mode === 'verify-change') goTo({ mode: 'create', purpose: 'change' });
        else closeGate();
      }
    } catch {
      if (gate === current) error = 'PIN konnte nicht verarbeitet werden.';
    } finally {
      if (gate === current) {
        buffer = '';
        busy = false;
        renderGate();
      }
    }
  }

  function enterKey(key: string): void {
    if (!gate || busy || secondsUntilUnlock()) return;
    error = '';
    if (key === 'Backspace') buffer = buffer.slice(0, -1);
    else buffer += key;
    renderGate();

    if (buffer.length === 6) {
      busy = true;
      void completePin(gate, buffer);
    }
  }

  function lockApp(): void {
    if (settings && gate?.mode !== 'unlock') openGate({ mode: 'unlock' });
  }

  element('securityButton', 'button').addEventListener('click', () => {
    closeMenu();
    dialog.showModal();
  });
  element('closeSecurityButton', 'button').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  pinSwitch.addEventListener('click', () => {
    if (settings) openGate({ mode: 'verify-disable' });
    else openGate({ mode: 'create', purpose: 'enable' });
  });
  changeButton.addEventListener('click', () => openGate({ mode: 'verify-change' }));
  lockButton.addEventListener('click', lockApp);
  keypad.addEventListener('click', (event) => {
    const key = event.target instanceof Element ? event.target.closest('button') : null;
    if (key?.dataset.digit !== undefined) enterKey(key.dataset.digit);
    else if (key?.hasAttribute('data-erase')) enterKey('Backspace');
  });
  cancelButton.addEventListener('click', closeGate);
  document.addEventListener('keydown', (event) => {
    if (!gate) return;
    if (/^\d$/.test(event.key) || event.key === 'Backspace') {
      event.preventDefault();
      enterKey(event.key);
    } else if (event.key === 'Escape' && gate.mode !== 'unlock') {
      event.preventDefault();
      closeGate();
    }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) lockApp(); });
  window.addEventListener('pagehide', lockApp);
  window.setInterval(() => { if (isVerifying() && settings?.lockUntil) renderGate(); }, 1000);

  const unavailable = !crypto.subtle;
  pinSwitch.disabled = unavailable;
  element('pinUnavailable', 'p').hidden = !unavailable;
  refreshSecurityMenu();
  if (settings) openGate({ mode: 'unlock' });
  else setAppHidden(false);
}
