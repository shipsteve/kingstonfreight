import { loadEnvConfig } from '@next/env';
import { PrismaClient } from '@prisma/client';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { chromium } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';
loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
Object.assign(globalThis, { React });
const db = new PrismaClient();
async function main() {
  const { ReceiptView } = await import('../src/components/receipt/ReceiptView');
  const { asAddress } = await import('../src/lib/address');
  const { qrSvg } = await import('../src/server/qr');
  const { trackingUrl } = await import('../src/lib/receipt');
  const trackingNumber = process.argv[2];
  if (!/^876-\d{8}$/.test(trackingNumber ?? '')) throw new Error('Supply a tracking number');
  const s = await db.shipment.findUniqueOrThrow({ where: { trackingNumber }, include: { events: { orderBy: { createdAt: 'desc' }, take: 1 } } });
  const creator = s.createdById ? await db.user.findUnique({ where: { id: s.createdById }, select: { email: true } }) : null;
  const delivered = s.status === 'DELIVERED' ? await db.trackingEvent.findFirst({ where: { shipmentId: s.id, status: 'DELIVERED' }, orderBy: { createdAt: 'desc' } }) : null;
  const data = { ...s, issuedAt: s.createdAt, issuedBy: creator?.email ?? 'Online booking', latestUpdate: s.events[0] ?? null, deliveredAt: delivered?.createdAt ?? null, sender: asAddress(s.origin), recipient: asAddress(s.destination), pieces: (s.packages ?? []) as unknown as import('../src/lib/pricing/types').PackageInput[] };
  const url = trackingUrl(s.trackingNumber);
  const markup = renderToStaticMarkup(<ReceiptView data={data} url={url} qrSvg={await qrSvg(url)} />);
  const css = readFileSync('src/app/globals.css', 'utf8').split('/* Receipts (components/receipt/ReceiptView.tsx) */')[1];
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 500, height: 1600 } });
    await page.route('**/*', route => route.abort());
    await page.setContent(`<html><head><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0}h1,h2,p,figure{margin:0}h2{font:inherit}.font-bold{font-weight:700}.mb-1{margin-bottom:4px}.mt-1{margin-top:4px}.mt-2{margin-top:8px}${css}</style></head><body>${markup}</body></html>`);
    await page.emulateMedia({ media: 'print' });
    const height = Math.ceil(await page.locator('.receipt').evaluate(el => el.getBoundingClientRect().height) * 25.4 / 96) + 2;
    await page.addStyleTag({ content: `@page receipt-ticket { size:80mm ${height}mm; margin:0; }` });
    mkdirSync('exports', { recursive: true });
    const file = `exports/receipt-${trackingNumber}-updated.pdf`;
    const pdf = await page.pdf({ path: file, preferCSSPageSize: true, printBackground: true, displayHeaderFooter: false });
    if (pdf.toString('latin1').match(/\/Type \/Page\b/g)?.length !== 1) throw new Error('Expected one receipt page');
    await page.locator('.receipt').screenshot({ path: `exports/receipt-${trackingNumber}-updated-preview.png` });
    console.log(`Generated ${file}: one page, 80mm wide`);
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error.code ?? error.name); process.exitCode = 1; }).finally(() => db.$disconnect());
