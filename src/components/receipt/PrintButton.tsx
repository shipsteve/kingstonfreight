"use client";

import { Printer } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export function PrintButton() {
  useEffect(() => {
    const receipt = document.querySelector<HTMLElement>(".receipt");
    if (!receipt) return;
    const pageStyle = document.createElement("style");
    pageStyle.dataset.receiptPage = "true";
    document.head.appendChild(pageStyle);
    const sizePage = () => {
      // Measure at paper width even when the preview is on a narrower mobile screen.
      const copy = receipt.cloneNode(true) as HTMLElement;
      copy.setAttribute("aria-hidden", "true");
      Object.assign(copy.style, {
        position: "fixed", top: "0", left: "0", width: "80mm", maxWidth: "none",
        visibility: "hidden", border: "none", boxShadow: "none", margin: "0", pointerEvents: "none",
      });
      document.body.appendChild(copy);
      const heightMm = Math.ceil(copy.getBoundingClientRect().height * 25.4 / 96) + 2;
      copy.remove();
      pageStyle.textContent = `@page receipt-ticket { size: 80mm ${heightMm}mm; margin: 0; }`;
    };
    sizePage();
    const observer = new ResizeObserver(sizePage);
    observer.observe(receipt);
    window.addEventListener("beforeprint", sizePage);
    return () => {
      observer.disconnect();
      window.removeEventListener("beforeprint", sizePage);
      pageStyle.remove();
    };
  }, []);
  return (
    <Button type="button" onClick={() => window.print()}>
      <Printer /> Print receipt
    </Button>
  );
}
