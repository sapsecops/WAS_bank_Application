-- =============================================================
-- Banking Application - PostgreSQL Schema DDL
-- Run as: psql -h localhost -U bankadmin -d bankingdb -f schema.sql
-- =============================================================

-- Create dedicated schema
CREATE SCHEMA IF NOT EXISTS banking;
SET search_path TO banking;

-- =============================================================
-- CUSTOMER table
-- =============================================================
CREATE TABLE IF NOT EXISTS banking.customer (
    customer_id     VARCHAR(20)  PRIMARY KEY,
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    email           VARCHAR(200) NOT NULL,
    phone           VARCHAR(20),
    address         TEXT,
    kyc_status      VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    created_date    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_date    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_customer_email UNIQUE (email),
    CONSTRAINT chk_kyc_status CHECK (kyc_status IN ('PENDING','VERIFIED','REJECTED'))
);

-- =============================================================
-- ACCOUNT table
-- =============================================================
CREATE TABLE IF NOT EXISTS banking.account (
    account_id      VARCHAR(20)     PRIMARY KEY,
    customer_id     VARCHAR(20)     NOT NULL,
    account_type    VARCHAR(20)     NOT NULL,
    balance         NUMERIC(15,2)   NOT NULL DEFAULT 0.00,
    currency        VARCHAR(3)      NOT NULL DEFAULT 'INR',
    status          VARCHAR(20)     NOT NULL DEFAULT 'ACTIVE',
    branch_code     VARCHAR(10),
    created_date    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_account_customer FOREIGN KEY (customer_id)
        REFERENCES banking.customer(customer_id) ON DELETE RESTRICT,
    CONSTRAINT chk_balance     CHECK (balance >= 0),
    CONSTRAINT chk_acct_type   CHECK (account_type IN
        ('SAVINGS','CURRENT','LOAN','FIXED_DEPOSIT')),
    CONSTRAINT chk_acct_status CHECK (status IN
        ('ACTIVE','INACTIVE','FROZEN','CLOSED'))
);

-- =============================================================
-- TRANSACTION LOG table
-- =============================================================
CREATE TABLE IF NOT EXISTS banking.txn_log (
    txn_id          VARCHAR(36)     PRIMARY KEY,
    from_account    VARCHAR(20),
    to_account      VARCHAR(20),
    txn_type        VARCHAR(30)     NOT NULL,
    amount          NUMERIC(15,2)   NOT NULL,
    status          VARCHAR(20)     NOT NULL DEFAULT 'PENDING',
    reference_no    VARCHAR(50),
    remarks         TEXT,
    txn_timestamp   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_txn_from FOREIGN KEY (from_account)
        REFERENCES banking.account(account_id),
    CONSTRAINT fk_txn_to   FOREIGN KEY (to_account)
        REFERENCES banking.account(account_id),
    CONSTRAINT chk_txn_amount CHECK (amount > 0),
    CONSTRAINT chk_txn_type   CHECK (txn_type IN
        ('DEBIT','CREDIT','TRANSFER','REVERSAL','FEE','INTEREST')),
    CONSTRAINT chk_txn_status CHECK (status IN
        ('PENDING','SUCCESS','FAILED','REVERSED'))
);

-- =============================================================
-- INDEXES
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_account_customer  ON banking.account(customer_id);
CREATE INDEX IF NOT EXISTS idx_account_status    ON banking.account(status);
CREATE INDEX IF NOT EXISTS idx_txn_from          ON banking.txn_log(from_account);
CREATE INDEX IF NOT EXISTS idx_txn_to            ON banking.txn_log(to_account);
CREATE INDEX IF NOT EXISTS idx_txn_timestamp     ON banking.txn_log(txn_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_txn_status        ON banking.txn_log(status);

-- =============================================================
-- GRANTS for WAS user
-- =============================================================
GRANT USAGE  ON SCHEMA banking TO bankadmin;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES    IN SCHEMA banking TO bankadmin;
GRANT USAGE, SELECT                  ON ALL SEQUENCES IN SCHEMA banking TO bankadmin;
ALTER DEFAULT PRIVILEGES IN SCHEMA banking
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES    TO bankadmin;
ALTER DEFAULT PRIVILEGES IN SCHEMA banking
    GRANT USAGE, SELECT                  ON SEQUENCES TO bankadmin;

-- =============================================================
-- SEED DATA (for development / testing)
-- =============================================================
INSERT INTO banking.customer
    (customer_id, first_name, last_name, email, phone, address, kyc_status)
VALUES
    ('CUST001','Arjun','Sharma','arjun.sharma@email.com','9876543210',
     '12 MG Road, Bengaluru, KA 560001','VERIFIED'),
    ('CUST002','Priya','Nair','priya.nair@email.com','9876543211',
     '45 Anna Salai, Chennai, TN 600002','VERIFIED'),
    ('CUST003','Ravi','Kumar','ravi.kumar@email.com','9876543212',
     '7 Jubilee Hills, Hyderabad, TS 500033','PENDING')
ON CONFLICT DO NOTHING;

INSERT INTO banking.account
    (account_id, customer_id, account_type, balance, currency, status, branch_code)
VALUES
    ('ACC001001','CUST001','SAVINGS', 150000.00,'INR','ACTIVE','BLR001'),
    ('ACC001002','CUST001','CURRENT',  75000.00,'INR','ACTIVE','BLR001'),
    ('ACC002001','CUST002','SAVINGS',  50000.00,'INR','ACTIVE','CHN001'),
    ('ACC003001','CUST003','SAVINGS',  10000.00,'INR','ACTIVE','HYD001')
ON CONFLICT DO NOTHING;

-- Verification query
SELECT
    c.customer_id,
    c.first_name || ' ' || c.last_name AS customer_name,
    a.account_id,
    a.account_type,
    a.balance,
    a.status
FROM banking.customer c
JOIN banking.account a ON a.customer_id = c.customer_id
ORDER BY c.customer_id, a.account_id;
