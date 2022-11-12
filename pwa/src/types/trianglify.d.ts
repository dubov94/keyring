declare module 'trianglify' {
  interface Options {
    width?: number;
    height?: number;
    xColors?: string | string[];
    yColors?: string | string[];
    seed?: string;
  }

  interface Pattern {
    toCanvas(element: HTMLElement): void;
  }

  function Trianglify(options: Options): Pattern;
  export = Trianglify;
}
