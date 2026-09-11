/**
 * Pure SVG Code 128 / Barcode Generator.
 * Zero external dependencies, 100% crisp vector SVG for thermal & laser printing.
 */

const CODE128_PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213", // 0-9
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132", // 10-19
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211", // 20-29
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313", // 30-39
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331", // 40-49
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111", // 50-59
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214", // 60-69
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111", // 70-79
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141", // 80-89
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141", // 90-99
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112" // 100-106
];

const START_B = 104;
const STOP = 106;

/**
 * Encodes text into Code 128 (Set B) patterns and returns an inline SVG string.
 */
function generateBarcodeSVG(rawText, options = {}) {
  const text = String(rawText || '000000').trim();
  const height = options.height || 40;
  const barWidth = options.barWidth || 2;
  const showText = options.showText !== false;
  const fontSize = options.fontSize || 11;
  const quietZone = options.quietZone !== undefined ? options.quietZone : 10;

  // Encode values
  const codes = [START_B];
  let checkSum = START_B;

  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    let val = charCode - 32;
    if (val < 0 || val > 95) val = 0; // Fallback for out-of-range ASCII
    codes.push(val);
    checkSum += val * (i + 1);
  }

  codes.push(checkSum % 103);
  codes.push(STOP);

  // Calculate total module width
  let totalModules = 0;
  for (const code of codes) {
    const pattern = CODE128_PATTERNS[code] || "212222";
    for (let j = 0; j < pattern.length; j++) {
      totalModules += parseInt(pattern[j], 10);
    }
  }

  const svgWidth = totalModules * barWidth + quietZone * 2;
  const textHeight = showText ? fontSize + 4 : 0;
  const svgHeight = height + textHeight;

  // Generate rects
  let currentX = quietZone;
  const rects = [];

  for (const code of codes) {
    const pattern = CODE128_PATTERNS[code] || "212222";
    for (let j = 0; j < pattern.length; j++) {
      const width = parseInt(pattern[j], 10) * barWidth;
      const isBar = j % 2 === 0;
      if (isBar) {
        rects.push(`<rect x="${currentX}" y="0" width="${width}" height="${height}" fill="#000000" />`);
      }
      currentX += width;
    }
  }

  const textElement = showText
    ? `<text x="${svgWidth / 2}" y="${height + fontSize}" font-family="Arial, Helvetica, monospace" font-size="${fontSize}px" font-weight="700" text-anchor="middle" fill="#000000" letter-spacing="1.5px">${text}</text>`
    : '';

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" width="100%" height="auto" style="max-height: ${svgHeight}px; display: block; margin: 0 auto;">
  ${rects.join('\n  ')}
  ${textElement}
</svg>`.trim();
}

module.exports = { generateBarcodeSVG };
