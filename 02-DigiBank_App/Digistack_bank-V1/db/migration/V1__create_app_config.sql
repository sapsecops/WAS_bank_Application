-- V1__create_app_config.sql
-- Creates the app_config table for P01 v1's live DB read proof-of-concept.

CREATE TABLE app_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value VARCHAR(255) NOT NULL
);

INSERT INTO app_config (config_key, config_value)
VALUES ('welcome_message', 'DigiStack Bank is online.');