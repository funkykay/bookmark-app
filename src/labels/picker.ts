import { element } from '../dom';
import { messages } from '../i18n';
import { defaultLabelColor, labelKey, maxLabelLength } from '../bookmarks/model';
import type { Label } from '../bookmarks/model';
import { labelBadge, sortedLabels } from './display';

export function initLabelPicker() {
  const editor = element('editor', 'dialog');
  const input = element('labelInput', 'input');
  const selected = element('selectedLabels', 'div');
  const suggestions = element('labelSuggestions', 'ul');
  const add = element('assignLabel', 'button');
  input.maxLength = maxLabelLength;
  let available: Label[] = [];
  let chosen: (Pick<Label, 'name' | 'color'> & { id?: string })[] = [];
  let active: Element | null = null;

  function renderChosen(): void {
    selected.replaceChildren(...chosen.map(label => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'chosen-label';
      button.setAttribute('aria-label', messages().removeLabel(label.name));
      button.append(labelBadge(label));
      button.addEventListener('click', () => {
        chosen = chosen.filter(item => item !== label);
        renderChosen();
        input.focus();
      });
      return button;
    }));
  }

  function setActive(option: Element | null): void {
    active?.setAttribute('aria-selected', 'false');
    active = option;
    if (active) {
      active.setAttribute('aria-selected', 'true');
      input.setAttribute('aria-activedescendant', active.id);
      active.scrollIntoView({ block: 'nearest' });
    } else {
      input.removeAttribute('aria-activedescendant');
    }
  }

  function close(): void {
    setActive(null);
    suggestions.hidden = true;
    input.setAttribute('aria-expanded', 'false');
  }

  function positionSuggestions(): void {
    const field = input.getBoundingClientRect();
    const dialog = editor.getBoundingClientRect();
    const above = field.top - Math.max(dialog.top, 0) - 6;
    const below = Math.min(dialog.bottom, window.innerHeight) - field.bottom - 6;
    suggestions.style.removeProperty('--available-space');
    const opensAbove = suggestions.offsetHeight > below && above > below;
    suggestions.classList.toggle('opens-above', opensAbove);
    suggestions.style.setProperty('--available-space', `${Math.max(0, opensAbove ? above : below)}px`);
  }

  function showMatches(): void {
    setActive(null);
    const query = labelKey(input.value);
    const ids = new Set(chosen.map(label => label.id));
    const matches = available.filter(label => !ids.has(label.id) && labelKey(label.name).includes(query));
    suggestions.replaceChildren(...matches.map(label => {
      const option = document.createElement('li');
      option.id = `label-option-${label.id}`;
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', 'false');
      option.append(labelBadge(label));
      option.addEventListener('click', () => select(label.name));
      return option;
    }));
    suggestions.hidden = matches.length === 0;
    if (!suggestions.hidden) positionSuggestions();
    suggestions.scrollTop = 0;
    input.setAttribute('aria-expanded', String(!suggestions.hidden));
    add.disabled = !query;
  }

  function accept(name: string): void {
    if (!name) return;
    const key = labelKey(name);
    if (!chosen.some(label => labelKey(label.name) === key)) {
      chosen.push(available.find(label => labelKey(label.name) === key) ?? { name, color: defaultLabelColor });
    }
    input.value = '';
    add.disabled = true;
    renderChosen();
    close();
  }

  function select(name: string): void {
    input.focus();
    accept(name);
  }

  input.addEventListener('focus', showMatches);
  input.addEventListener('click', () => { if (suggestions.hidden) showMatches(); });
  input.addEventListener('input', showMatches);
  input.addEventListener('blur', event => { if (event.relatedTarget !== suggestions) close(); });
  suggestions.addEventListener('blur', close);
  suggestions.addEventListener('mousedown', event => {
    if (event.target !== suggestions) event.preventDefault();
  });
  input.addEventListener('keydown', event => {
    if (event.isComposing) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (suggestions.hidden) showMatches();
      if (suggestions.hidden) return;
      event.preventDefault();
      const next = event.key === 'ArrowDown'
        ? (active ? active.nextElementSibling : suggestions.firstElementChild)
        : (active ? active.previousElementSibling : suggestions.lastElementChild);
      if (next) setActive(next);
    } else if (event.key === 'Escape' && !suggestions.hidden) {
      event.preventDefault();
      close();
    } else if (event.key === 'Enter') {
      const name = active?.textContent ?? input.value.trim();
      if (name) {
        event.preventDefault();
        accept(name);
      }
    }
  });
  add.addEventListener('click', () => select(input.value.trim()));

  return {
    reset(labels: readonly Label[], initial: Label[]) {
      available = sortedLabels(labels);
      chosen = initial;
      input.value = '';
      add.disabled = true;
      close();
      renderChosen();
    },
    read() {
      accept(input.value.trim());
      return chosen.map(label => label.id ? { id: label.id } : { name: label.name });
    },
  };
}
