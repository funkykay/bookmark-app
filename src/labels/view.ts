import { defaultLabelColor, maxLabelLength } from '../bookmarks/model';
import { createLibraryEditor } from '../bookmarks/editor';
import { deleteLabel, saveLabel } from '../bookmarks/operations';
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
  const form = element('labelForm', 'form');
  const draft = createLibraryEditor<Label>(store, dialog, form, error);
  name.maxLength = maxLabelLength;

  function open(label?: Label): void {
    draft.begin(label);
    title.textContent = label ? messages().editLabel : messages().addLabel;
    name.value = label?.name ?? '';
    color.value = label?.color ?? defaultLabelColor;
    remove.hidden = !label;
    dialog.showModal();
    name.focus();
  }

  function focusRow(id?: string): void {
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

  form.addEventListener('submit', event => {
    event.preventDefault();
    const input = { name: name.value, color: color.value };
    void draft.submit((library, original) => saveLabel(library, input, original),
      label => focusRow(label.id), () => name.focus());
  });

  remove.addEventListener('click', () => {
    const label = draft.original;
    if (label && window.confirm(messages().deleteNamed(label.name))) {
      void draft.submit(library => deleteLabel(library, label), () => focusRow());
    }
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
