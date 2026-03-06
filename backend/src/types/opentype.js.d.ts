declare module 'opentype.js' {
  export interface Font {
    getPath(text: string, x: number, y: number, fontSize: number): Path
  }
  export interface Path {
    fill?: string
    toPathData?(decimalPlaces?: number): string
    toSVG?(decimalPlaces?: number): string
  }
  export function loadSync(url: string): Font
  const def: { loadSync: typeof loadSync }
  export default def
}
