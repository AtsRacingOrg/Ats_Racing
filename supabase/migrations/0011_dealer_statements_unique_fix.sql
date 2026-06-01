-- =============================================================================
-- ATS Racing — dealer_statements.statement_no unique constraint düzeltmesi
-- statement_no global unique idi — farklı bayiler aynı ayda sipariş verince
-- aynı EXT-YYYY-MM kodu çakışıyor ve create_order 500 hatası veriyordu.
-- Çözüm: global unique → (dealer_id, statement_no) composite unique.
-- =============================================================================

alter table dealer_statements drop constraint if exists dealer_statements_statement_no_key;
drop index if exists dealer_statements_statement_no_key;
create unique index if not exists dealer_statements_dealer_no_uidx
  on dealer_statements (dealer_id, statement_no);
