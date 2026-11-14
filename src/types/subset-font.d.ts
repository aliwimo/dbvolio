declare module "subset-font" {
  export default function subsetFont(
    font: BufferSource,
    text: string,
    options?: {
      targetFormat?: "sfnt" | "woff" | "woff2" | "truetype";
      variationAxes?: Record<string, number>;
    },
  ): Promise<Uint8Array>;
}
