import { element } from '../dom';
import type { PinControls } from '../pin/view';
import type { View } from '../views';

export function initSettings(pin: Pick<PinControls, 'enabled' | 'toggleProtection' | 'changePin'>): View {
  const pinSwitch = element('pinSwitch', 'button');
  const changeButton = element('changePinButton', 'button');

  pinSwitch.disabled = !crypto.subtle;
  element('pinUnavailable', 'p').hidden = !pinSwitch.disabled;
  pinSwitch.addEventListener('click', pin.toggleProtection);
  changeButton.addEventListener('click', pin.changePin);

  return {
    root: element('settingsView', 'main'),
    render() {
      pinSwitch.setAttribute('aria-checked', String(pin.enabled));
      changeButton.hidden = !pin.enabled;
    },
  };
}
