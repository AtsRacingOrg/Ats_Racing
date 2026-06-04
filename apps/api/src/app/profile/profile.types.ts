export type BillingType = 'individual' | 'corporate';

export interface BillingRow {
  user_id: string;
  type: BillingType;
  full_name: string | null;
  tc_no: string | null;
  company_name: string | null;
  tax_office: string | null;
  tax_number: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  district: string | null;
  updated_at: string;
}

export interface BillingView {
  type: BillingType;
  fullName: string | null;
  tcNo: string | null;
  companyName: string | null;
  taxOffice: string | null;
  taxNumber: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  district: string | null;
}

export function toBillingView(r: BillingRow | null): BillingView | null {
  if (!r) { return null; }
  return {
    type: r.type,
    fullName: r.full_name,
    tcNo: r.tc_no,
    companyName: r.company_name,
    taxOffice: r.tax_office,
    taxNumber: r.tax_number,
    phone: r.phone,
    address: r.address,
    city: r.city,
    district: r.district,
  };
}

export function billingComplete(b: BillingView | null): boolean {
  if (!b) { return false; }
  const has = (v: string | null) => !!(v && v.trim());
  if (b.type === 'individual') {
    return has(b.fullName) && has(b.tcNo) && has(b.address) && has(b.city);
  }
  return has(b.companyName) && has(b.taxOffice) && has(b.taxNumber) && has(b.address) && has(b.city);
}
