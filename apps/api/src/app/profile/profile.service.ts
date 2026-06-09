import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { UpdateProfileDto, UpsertBillingDto } from './profile.dto';
import { BillingRow, BillingView, billingComplete, toBillingView } from './profile.types';

export interface AccountView {
  fullName: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  dealershipName: string | null;
  country: string;
  /** Fatura bilgisi yalnızca Türkiye müşterileri için zorunlu. */
  billingRequired: boolean;
  billing: BillingView | null;
  billingComplete: boolean;
}

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async getAccount(userId: string): Promise<AccountView> {
    const { data: p } = await this.supabase.admin
      .from('profiles')
      .select('full_name, email, phone, role, dealership_name, country')
      .eq('id', userId)
      .single<{ full_name: string | null; email: string | null; phone: string | null; role: string; dealership_name: string | null; country: string | null }>();

    const { data: b } = await this.supabase.admin
      .from('billing_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle<BillingRow>();

    const billing = toBillingView(b ?? null);
    const country = (p?.country ?? 'TR').toUpperCase();
    return {
      fullName: p?.full_name ?? null,
      email: p?.email ?? null,
      phone: p?.phone ?? null,
      role: p?.role ?? 'user',
      dealershipName: p?.dealership_name ?? null,
      country,
      billingRequired: country === 'TR',
      billing,
      billingComplete: billingComplete(billing),
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<{ ok: boolean }> {
    const patch: Record<string, unknown> = {};
    if (dto.fullName !== undefined) { patch.full_name = dto.fullName.trim(); }
    if (dto.phone !== undefined) { patch.phone = dto.phone.trim() || null; }
    if (dto.dealershipName !== undefined) { patch.dealership_name = dto.dealershipName.trim() || null; }
    if (Object.keys(patch).length === 0) { return { ok: true }; }
    const { error } = await this.supabase.admin.from('profiles').update(patch).eq('id', userId);
    if (error) {
      this.logger.error(`updateProfile failed: ${error.message}`);
      throw new InternalServerErrorException('Profil güncellenemedi.');
    }
    return { ok: true };
  }

  async changePassword(accessToken: string, newPassword: string): Promise<{ ok: boolean }> {
    const client = this.supabase.clientFor(accessToken);
    const { error } = await client.auth.updateUser({ password: newPassword });
    if (error) {
      this.logger.warn(`changePassword failed: ${error.message}`);
      throw new BadRequestException(
        /weak|pwned|leaked|short|least/i.test(error.message)
          ? 'Şifre yeterince güçlü değil. Daha güçlü bir şifre seç.'
          : 'Şifre değiştirilemedi.',
      );
    }
    return { ok: true };
  }

  async upsertBilling(userId: string, dto: UpsertBillingDto): Promise<{ ok: boolean; complete: boolean }> {
    const individual = dto.type === 'individual';
    // Tek kayıt: seçilen tipin alanları tutulur, diğer tipin alanları temizlenir.
    const row = {
      user_id: userId,
      type: dto.type,
      full_name: individual ? (dto.fullName?.trim() || null) : null,
      tc_no: individual ? (dto.tcNo?.trim() || null) : null,
      company_name: individual ? null : (dto.companyName?.trim() || null),
      tax_office: individual ? null : (dto.taxOffice?.trim() || null),
      tax_number: individual ? null : (dto.taxNumber?.trim() || null),
      phone: dto.phone?.trim() || null,
      address: dto.address?.trim() || null,
      city: dto.city?.trim() || null,
      district: dto.district?.trim() || null,
      updated_at: new Date().toISOString(),
    };
    const { error } = await this.supabase.admin
      .from('billing_profiles')
      .upsert(row, { onConflict: 'user_id' });
    if (error) {
      this.logger.error(`upsertBilling failed: ${error.message}`);
      throw new InternalServerErrorException('Fatura bilgileri kaydedilemedi.');
    }
    return { ok: true, complete: billingComplete(toBillingView(row as BillingRow)) };
  }

  /** Fatura kaydını siler. */
  async deleteBilling(userId: string): Promise<{ ok: boolean }> {
    const { error } = await this.supabase.admin
      .from('billing_profiles')
      .delete()
      .eq('user_id', userId);
    if (error) {
      this.logger.error(`deleteBilling failed: ${error.message}`);
      throw new InternalServerErrorException('Fatura bilgileri silinemedi.');
    }
    return { ok: true };
  }

  /** Admin: bir kullanıcının fatura bilgisi. */
  async getBilling(userId: string): Promise<BillingView | null> {
    const { data } = await this.supabase.admin
      .from('billing_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle<BillingRow>();
    return toBillingView(data ?? null);
  }
}
