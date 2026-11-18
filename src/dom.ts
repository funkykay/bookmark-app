export function element<K extends keyof HTMLElementTagNameMap>(id: string, tag: K): HTMLElementTagNameMap[K] {
  const node = document.getElementById(id);
  if (!node || node.tagName.toLowerCase() !== tag) {
    throw new Error(`Erwartetes Element fehlt: ${tag}#${id}`);
  }
  return node as HTMLElementTagNameMap[K];
}

export function createToast(): (value: string) => void {
  const toast = element('toast', 'div');
  let timer: number | undefined;

  return (value) => {
    window.clearTimeout(timer);
    toast.textContent = value;
    toast.hidden = false;
    timer = window.setTimeout(() => { toast.hidden = true; }, 3300);
  };
}
