-- Migration 005: Shift courier API credentials to encrypted DPAPI vault
ALTER TABLE couriers ADD COLUMN credential_id TEXT;

-- Clear plaintext secrets from database table
UPDATE couriers SET api_key = NULL, account_number = NULL;
