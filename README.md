# Banking Application — WebSphere 9.x + PostgreSQL
## Phase 1: Foundation & Setup

---

## Project Structure

```
BankingApp/
├── pom.xml                          ← Parent Maven build
├── README.md                        ← This file
│
├── BankingCommon/                   ← Shared JAR (entities, DTOs, exceptions)
│   └── src/main/java/com/banking/
│       ├── model/
│       │   ├── Customer.java        ← JPA entity
│       │   ├── Account.java         ← JPA entity
│       │   └── TransactionLog.java  ← JPA entity
│       └── exception/
│           └── BankingException.java
│
├── BankingEJB/                      ← EJB JAR (business logic)
│   └── src/main/
│       ├── java/com/banking/ejb/
│       │   ├── CustomerServiceBean.java   ← @Stateless
│       │   ├── AccountServiceBean.java    ← @Stateless
│       │   └── FundTransferBean.java      ← @Stateless + CMT
│       └── resources/META-INF/
│           ├── persistence.xml      ← JPA/OpenJPA → PostgreSQL
│           ├── ejb-jar.xml          ← EJB descriptors
│           └── ibm-ejb-jar-bnd.xml  ← WAS bindings
│
├── BankingWeb/                      ← WAR (servlets, REST)
│   └── src/main/
│       ├── java/com/banking/web/servlet/
│       │   └── HealthCheckServlet.java
│       ├── webapp/WEB-INF/
│       │   ├── web.xml              ← Servlet + security config
│       │   └── ibm-web-bnd.xml      ← WAS web bindings
│       └── resources/
│           └── log4j2.xml           ← Logging configuration
│
├── BankingEAR/                      ← EAR packager
│   └── src/main/application/META-INF/
│       ├── application.xml          ← EAR descriptor
│       └── ibm-application-bnd.xml  ← WAS security role mappings
│
├── config/
│   └── postgresql/
│       ├── schema.sql               ← Full DDL + seed data
│       └── postgresql-tuning.conf   ← pg_hba.conf + postgresql.conf settings
│
└── scripts/
    ├── setup-phase1.sh              ← One-shot Linux setup script
    ├── was-setup.py                 ← wsadmin: JDBC, datasource, JVM tuning
    ├── deploy.py                    ← wsadmin: deploy EAR
    └── rollback-verify.py           ← wsadmin: undeploy + verify DS
```

---

## Prerequisites

| Software | Version | Notes |
|----------|---------|-------|
| WebSphere Application Server | 9.0.x Traditional | Not Liberty |
| IBM Installation Manager | 1.9+ | To install WAS |
| PostgreSQL | 15+ | Any 12+ works |
| Java | 8 (1.8) | Bundled with WAS |
| Maven | 3.8+ | For building the project |
| IBM RAD or Eclipse + WDT | Latest | IDE (optional but recommended) |

---

## Quick Start (Linux)

### Step 1 — Install WAS 9.x first (manual)
Download from IBM Fix Central. Install using IBM Installation Manager to `/opt/IBM/WebSphere/AppServer`.

### Step 2 — Run the setup script
```bash
cd BankingApp/scripts
chmod +x setup-phase1.sh
sudo ./setup-phase1.sh
```

This automatically:
- Installs and configures PostgreSQL
- Creates the `bankingdb` database and `bankadmin` user
- Applies `pg_hba.conf` and `postgresql.conf` tuning
- Runs `schema.sql` to create tables and seed data
- Downloads the PostgreSQL JDBC driver into WAS
- Creates a WAS profile and starts the server
- Configures J2C auth alias, JDBC provider, XA datasource, connection pool
- Tunes JVM heap and thread pools

### Step 3 — Build the EAR
```bash
cd BankingApp
mvn clean package
cp BankingEAR/target/BankingEAR-1.0.0.ear /opt/deployments/BankingApp.ear
```

### Step 4 — Deploy to WAS
```bash
/opt/IBM/WebSphere/AppServer/profiles/BankingProfile/bin/wsadmin.sh \
    -lang jython -username wasadmin -password Admin@12345 \
    -f scripts/deploy.py
```

### Step 5 — Verify
```bash
curl http://localhost:9080/banking/health
# Expected: {"status": "UP", "db_status": "CONNECTED", ...}
```

---

## Manual WAS Admin Console Steps

Access: `https://localhost:9043/ibm/console` (wasadmin / Admin@12345)

### Verify JDBC Datasource
`Resources → JDBC → Data Sources → BankingDS → Test connection`

### Check server status
`Servers → Server Types → WebSphere Application Servers → BankingServer`

### View logs
`Troubleshooting → Logs and Trace → BankingServer → JVM Logs`

---

## Key Ports

| Port | Purpose |
|------|---------|
| 9080 | HTTP application traffic |
| 9443 | HTTPS application traffic |
| 9060 | Admin Console HTTP |
| 9043 | Admin Console HTTPS |
| 5432 | PostgreSQL |

---

## WAS JNDI Names

| Resource | JNDI Name |
|----------|-----------|
| Banking DataSource | `jdbc/BankingDS` |
| CustomerServiceBean | `ejb/CustomerServiceBean` |
| AccountServiceBean | `ejb/AccountServiceBean` |
| FundTransferBean | `ejb/FundTransferBean` |

---

## Database Credentials (dev only — use J2C alias in WAS)

| Parameter | Value |
|-----------|-------|
| Host | localhost |
| Port | 5432 |
| Database | bankingdb |
| User | bankadmin |
| Password | Bank@12345 |
| Schema | banking |

---

## Troubleshooting

**Cannot connect to PostgreSQL from WAS:**
- Check `pg_hba.conf` has the host entry for bankadmin
- Run: `psql -h 127.0.0.1 -U bankadmin -d bankingdb`
- Test from Admin Console: `Resources → JDBC → Data Sources → BankingDS → Test connection`

**OutOfMemoryError in WAS:**
- Increase heap: `Servers → BankingServer → Java and Process Management → JVM → Max heap 2048`
- Or re-run `was-setup.py`

**EJB/JPA errors on startup:**
- Check `persistence.xml` — confirm `jta-data-source` matches JNDI name `jdbc/BankingDS`
- Check `SystemOut.log` for OpenJPA dialect warnings

**Tables not found:**
- Run: `psql -h 127.0.0.1 -U bankadmin -d bankingdb -f config/postgresql/schema.sql`

---

## Next — Phase 2

Phase 2 will add:
- Full REST API layer (JAX-RS) for all banking operations
- SOAP Web Service (JAX-WS) for core banking integration
- Additional entities: Branch, LoanAccount, Card
- Input validation, DTOs, error response mapping

Run `mvn clean package` and re-deploy after adding Phase 2 code.
