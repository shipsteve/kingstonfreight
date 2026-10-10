import QRCode from "qrcode";

/** Crisp, print-friendly QR code as inline SVG markup (rendered server-side). */
export async function qrSvg(text: string): Promise<string> {
  return QRCode.toString(text, { type: "svg", errorCorrectionLevel: "M", margin: 1 });
}
