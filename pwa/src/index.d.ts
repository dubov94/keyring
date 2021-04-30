export {}

declare global {
  interface Window {
    globals: {
      version: string;
      // https://cli.vuejs.org/guide/mode-and-env.html
      mode: 'development' | 'test' | 'production';
    };
  }
}
