import { defaultLabelColor, labelKey, maxLabelLength, newLabel } from '../bookmarks/model';
import type { Label } from '../bookmarks/model';
import type { BookmarkStore } from '../bookmarks/store';
import { element } from '../dom';
import { messages } from '../i18n';
import type { View } from '../views';
import { labelBadge, sortedLabels } from './display';

export function initLabels(store: BookmarkStore): View {
  const list = element('managedLabels', 'ul');
  const empty = element('labelsEmpty', 'p');
  const dialog = element('labelEditor', 'dialog');
  const title = element('labelTitle', 'h2');
  const name = element('labelName', 'input');
  const color = element('labelColor', 'input');
  const error = element('labelError', 'p');
  const remove = element('deleteLabel', 'button');
  const add = element('newLabel', 'button');
  let editing: Label | undefined;
  name.maxLength = maxLabelLength;

  function open(label?: Label): void {
    editing = label;
    title.textContent = label ? messages().editLabel : messages().addLabel;
    name.value = label?.name ?? '';
    color.value = label?.color ?? defaultLabelColor;
    error.textContent = '';
    remove.hidden = !label;
    dialog.showModal();
    name.focus();
  }

  function finish(id?: string): void {
    dialog.close();
    const row = list.querySelector<HTMLButtonElement>(`[data-label-id="${id}"]`);
    (row ?? add).focus();
  }

  function render(): void {
    empty.hidden = store.data.labels.length > 0;
    list.replaceChildren(...sortedLabels(store.data.labels).map(label => {
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'manage-label';
      button.dataset.labelId = label.id;
      button.setAttribute('aria-label', messages().editNamed(label.name));
      button.append(labelBadge(label));
      button.addEventListener('click', () => open(label));
      item.append(button);
      return item;
    }));
  }

  element('labelForm', 'form').addEventListener('submit', event => {
    event.preventDefault();
    const value = name.value.trim();
    const duplicate = store.data.labels.some(label => label.id !== editing?.id && labelKey(label.name) === labelKey(value));
    if (!value || duplicate) {
      error.textContent = duplicate ? messages().labelTaken : messages().missingName;
      name.focus();
      return;
    }
    const label = { ...(editing ?? newLabel(value)), name: value, color: color.value };
    const labels = editing ? store.data.labels.map(item => item.id === label.id ? label : item) : [...store.data.labels, label];
    if (store.save({ ...store.data, labels })) finish(label.id);
  });

  remove.addEventListener('click', () => {
    if (!editing || !window.confirm(messages().deleteNamed(editing.name))) return;
    const id = editing.id;
    const updated = new Date().toISOString();
    const labels = store.data.labels.filter(label => label.id !== id);
    const bookmarks = store.data.bookmarks.map(bookmark => bookmark.labelIds.includes(id)
      ? { ...bookmark, labelIds: bookmark.labelIds.filter(ref => ref !== id), updated }
      : bookmark);
    if (store.save({ bookmarks, labels })) finish();
  });
  add.addEventListener('click', () => open());
  element('cancelLabel', 'button').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  return {
    path: '/labels',
    root: element('labelsView', 'main'),
    render,
    leave() { if (dialog.open) dialog.close(); },
  };
}
