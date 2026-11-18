import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    modulePreload: false,
    assetsInlineLimit: () => true,
    rolldownOptions: { output: { codeSplitting: false } },
  },
  plugins: [{
    name: 'standalone-html',
    apply: 'build',
    generateBundle: {
      order: 'post',
      handler(_, bundle) {
        const page = bundle['index.html'];
        page.source = page.source
          .replace(/<script\b[^>]*\bsrc="\.\/([^"]+)"[^>]*><\/script>/g, (_, path) => {
            const code = bundle[path].code.replace(/<\/script/gi, '<\\/script');
            delete bundle[path];
            return `<script type="module">${code}</script>`;
          })
          .replace(/<link\b[^>]*\brel="stylesheet"[^>]*\bhref="\.\/([^"]+)"[^>]*>/g, (_, path) => {
            const css = bundle[path].source.replace(/<\/style/gi, '<\\/style');
            delete bundle[path];
            return `<style>${css}</style>`;
          });
        if (Object.keys(bundle).length !== 1) this.error('Der Build enthält zusätzliche Dateien.');
      },
    },
  }],
});
