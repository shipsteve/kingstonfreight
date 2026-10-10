import { site } from "./site";

export const LEGAL_LAST_UPDATED = "October 10, 2026";

/** Company details shown on legal and contact pages. Set via env; anything unset is simply omitted. */
export function legal() {
  const clean = (v: string | undefined) => v?.trim() || null;
  return {
    legalName: clean(process.env.COMPANY_LEGAL_NAME) ?? site.name,
    address: clean(process.env.COMPANY_ADDRESS),
    supportEmail: clean(process.env.SUPPORT_EMAIL),
    supportPhone: clean(process.env.SUPPORT_PHONE),
    governingState: clean(process.env.GOVERNING_STATE),
  };
}
