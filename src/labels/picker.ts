import { element } from '../dom';
import { messages } from '../i18n';
import { labelKey, maxLabelLength, newLabel } from '../bookmarks/model';
import type { Label } from '../bookmarks/model';
import { labelBadge, sortedLabels } from './display';

export function initLabelPicker() {
  const input = element('labelInput', 'input');
  const selected = element('selectedLabels', 'div');
  const suggestions = element('labelSuggestions', 'datalist');
  const add = element('assignLabel', 'button');
  input.maxLength = maxLabelLength;
  let available: Label[] = [];
  let chosen: Label[] = [];

  function render(): void {
    selected.replaceChildren(...chosen.map(label => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'chosen-label';
      button.setAttribute('aria-label', messages().removeLabel(label.name));
      button.append(labelBadge(label));
      button.addEventListener('click', () => {
        chosen = chosen.filter(item => item.id !== label.id);
        render();
        input.focus();
      });
      return button;
    }));
    const ids = new Set(chosen.map(label => label.id));
    suggestions.replaceChildren(...available.filter(label => !ids.has(label.id)).map(label => new Option(label.name)));
    add.disabled = !input.value.trim();
  }

  function acceptInput(): void {
    const name = input.value.trim();
    if (!name) return;
    const key = labelKey(name);
    if (!chosen.some(label => labelKey(label.name) === key)) {
      chosen.push(available.find(label => labelKey(label.name) === key) ?? newLabel(name));
    }
    input.value = '';
    render();
  }

  input.addEventListener('input', () => { add.disabled = !input.value.trim(); });
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.isComposing && input.value.trim()) {
      event.preventDefault();
      acceptInput();
    }
  });
  add.addEventListener('click', () => {
    acceptInput();
    input.focus();
  });

  return {
    reset(labels: readonly Label[], initial: Label[]) {
      available = sortedLabels(labels);
      chosen = initial;
      input.value = '';
      render();
    },
    read(): readonly Label[] {
      acceptInput();
      return chosen;
    },
  };
}
