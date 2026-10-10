/**
 * Standard Code 128 (Subset B) barcode SVG generator.
 * Used for logistics, Air Waybills (AWB) and warehouse 1D laser scanning.
 */

const PATTERNS: readonly string[] = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112"
];

const START_B = 104;
const STOP = 106;
const QUIET_ZONE_MODULES = 10;

export type BarcodeOptions = {
  height?: number;
  moduleWidth?: number;
  includeText?: boolean;
  className?: string;
};

/**
 * Encodes ASCII text (Code 128 Set B) into a sequence of module widths.
 */
export function encodeCode128B(text: string): { modules: boolean[]; checksum: number } {
  const codes: number[] = [START_B];
  let checkSumSum = START_B;

  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i) - 32;
    if (code < 0 || code > 95) {
      throw new Error(`Unsupported character in Code 128B: "${text[i]}"`);
    }
    codes.push(code);
    checkSumSum += code * (i + 1);
  }

  const checksum = checkSumSum % 103;
  codes.push(checksum);
  codes.push(STOP);

  const modules: boolean[] = [];

  // Left quiet zone
  for (let q = 0; q < QUIET_ZONE_MODULES; q++) {
    modules.push(false);
  }

  // Render each symbol pattern
  for (const c of codes) {
    const pattern = PATTERNS[c];
    if (!pattern) {
      throw new Error(`Invalid pattern index: ${c}`);
    }
    let isBar = true;
    for (let p = 0; p < pattern.length; p++) {
      const width = Number(pattern[p]);
      for (let w = 0; w < width; w++) {
        modules.push(isBar);
      }
      isBar = !isBar;
    }
  }

  // Right quiet zone
  for (let q = 0; q < QUIET_ZONE_MODULES; q++) {
    modules.push(false);
  }

  return { modules, checksum };
}

/**
 * Generates an SVG string representation of a Code 128B barcode.
 */
export function generateCode128Svg(text: string, options: BarcodeOptions = {}): string {
  const height = options.height ?? 50;
  const moduleWidth = options.moduleWidth ?? 2;
  const includeText = options.includeText ?? false;
  const { modules } = encodeCode128B(text);

  const totalWidth = modules.length * moduleWidth;
  const textHeight = includeText ? 16 : 0;
  const totalHeight = height + textHeight;

  // Build SVG rects for black bars
  const rects: string[] = [];
  let currentRunStart = -1;

  for (let i = 0; i < modules.length; i++) {
    if (modules[i]) {
      if (currentRunStart === -1) currentRunStart = i;
    } else {
      if (currentRunStart !== -1) {
        const x = currentRunStart * moduleWidth;
        const w = (i - currentRunStart) * moduleWidth;
        rects.push(`<rect x="${x}" y="0" width="${w}" height="${height}" fill="currentColor" />`);
        currentRunStart = -1;
      }
    }
  }

  if (currentRunStart !== -1) {
    const x = currentRunStart * moduleWidth;
    const w = (modules.length - currentRunStart) * moduleWidth;
    rects.push(`<rect x="${x}" y="0" width="${w}" height="${height}" fill="currentColor" />`);
  }

  const textElement = includeText
    ? `<text x="${totalWidth / 2}" y="${height + 12}" text-anchor="middle" font-family="monospace" font-size="11" font-weight="600" fill="currentColor">${text}</text>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="100%" height="100%" preserveAspectRatio="none" shape-rendering="crispEdges">${rects.join("")}${textElement}</svg>`;
}
