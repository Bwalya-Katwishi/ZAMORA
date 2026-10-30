ALTER TABLE places DROP CONSTRAINT IF EXISTS places_kind_check;

ALTER TABLE places ADD CONSTRAINT places_kind_check
  CHECK (kind IN ('country', 'province', 'district', 'town', 'historical_region', 'water', 'landmark'));
