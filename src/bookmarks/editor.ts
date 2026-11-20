import { messages } from '../i18n';
import type { Library } from './model';
import type { Change } from './operations';
import type { BookmarkStore, WriteIssue } from './store';

export function createLibraryEditor<T>(store: BookmarkStore, dialog: HTMLDialogElement, form: HTMLFormElement, error: HTMLElement) {
  let session: { original?: T; generation?: string; pending: boolean } | undefined;

  return {
    begin(original?: T) {
      session = { original, generation: store.generation, pending: false };
      form.inert = false;
      error.textContent = '';
    },
    get original() { return session?.original; },
    async submit<R>(
      operation: (library: Library, original?: T) => Change<R>,
      onSaved?: (value: R) => void,
      onError?: (issue: WriteIssue) => void,
    ) {
      const current = session;
      if (!current || current.pending) return;
      current.pending = true;
      form.inert = true;
      const result = await store.change(current.generation, library => operation(library, current.original));
      if (session !== current) return;
      form.inert = false;
      current.pending = false;
      if (!dialog.open) return;
      if (result.ok) {
        dialog.close();
        onSaved?.(result.value);
      } else {
        error.textContent = messages()[result.issue];
        onError?.(result.issue);
      }
    },
  };
}
