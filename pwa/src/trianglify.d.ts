declare module 'trianglify' {
  interface Options {
    width?: Number;
    height?: Number;
    xColors?: string | Array<string>;
    yColors?: string | Array<string>;
    seed?: string
  }

  interface Pattern {
    toCanvas(element: HTMLElement): void;
  }

  function Trianglify(options: Options): Pattern;
  export = Trianglify;
}
