import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  base: './',
  define: { __LEGAL_PAGES__: mode !== 'release' },
  build: {
    modulePreload: false,
    assetsInlineLimit: () => true,
    rolldownOptions: { output: { codeSplitting: false } },
  },
  plugins: [{
    name: 'legal-pages',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        return html.replace(/<!-- legal-pages:start -->([\s\S]*?)<!-- legal-pages:end -->/g,
          mode === 'release' ? '' : '$1');
      },
    },
  }, {
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
}));
