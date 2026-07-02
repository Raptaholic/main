-- ════════════════════════════════════════════════════════════
-- NOVU PEPTIDES — remove SARMs from the catalogue
-- Selling SARMs is prohibited in the UAE. Run this ONCE on your existing
-- database to delete the SARM products from the price catalogue so they can no
-- longer be ordered. Safe to re-run (idempotent).
--
-- Historical orders are unaffected: each order stores its own item snapshot
-- (name/price) as JSONB, and there is no foreign key from orders to products.
-- ════════════════════════════════════════════════════════════
delete from public.products where id in (155,156,157,170,171,172,293,294);
