import { useMemo } from "react";
import { generateCode128Svg } from "@/lib/barcode/code128";

export function Barcode128({
  value,
  height = 48,
  className = "",
  includeText = false,
}: {
  value: string;
  height?: number;
  className?: string;
  includeText?: boolean;
}) {
  const svg = useMemo(() => {
    try {
      return generateCode128Svg(value, { height, includeText });
    } catch {
      return null;
    }
  }, [value, height, includeText]);

  if (!svg) return null;

  return (
    <div
      className={`inline-flex flex-col items-center text-neutral-900 ${className}`}
      data-testid="receipt-barcode"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
