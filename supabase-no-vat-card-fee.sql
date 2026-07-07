-- Not VAT-registered: remove VAT from every order. Card processing fee becomes
-- 2.9% (Stripe) / 3.9% (PayPal) of goods+delivery PLUS a fixed AED 1.00 per
-- transaction, card only. Cash on Delivery has no fee and no VAT.
-- Applied to the live DB via migration `remove_vat_card_fee_fixed` (2026-07-07).

-- 1. Direct-insert fallback policy (COD, discount-free) no longer requires VAT.
alter policy "anyone can place a clean order" on public.orders
with check (
  (status = 'processing') AND (subtotal >= 0) AND (delivery >= 0) AND (total >= 0)
  AND (discount = 0) AND (fee = 0) AND (payment_status = 'unpaid')
  AND (confirmed_by IS NULL) AND (confirmed_at IS NULL) AND (delivered_at IS NULL) AND (cancelled_at IS NULL)
  AND ((account_email IS NULL) OR (account_email = (auth.jwt() ->> 'email')))
  AND items_all_in_catalog(items) AND (subtotal = catalog_subtotal(items)) AND (subtotal = items_subtotal(items))
  AND (vat = 0) AND (total = round((subtotal + delivery), 2))
);

-- 2. place_order: VAT is always 0; fee = pct*(goods+delivery) + AED 1.00 (card only).
--    (Full function body lives in the applied migration; the fee/VAT block is:)
--      v_vat := 0;
--      v_fee := case p_pay_method
--        when 'card-stripe' then round((v_taxable + p_delivery) * 0.029 + 1.00, 2)
--        when 'card-paypal' then round((v_taxable + p_delivery) * 0.039 + 1.00, 2)
--        else 0 end;
--      v_total := round(v_taxable + p_delivery + v_fee, 2);
--      if p_vat <> 0 then raise exception 'vat mismatch'; end if;
