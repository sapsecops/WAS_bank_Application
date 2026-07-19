# 🏦 NextGenBank Enterprise Banking Application

---

# Project Structure

```
nextgenbank/
│
├── pom.xml
│
├── src/
│   ├── main/
│   │
│   ├── java/com/nextgenbank/
│   │      ├── model/
│   │      ├── dao/
│   │      ├── servlet/
│   │      └── util/
│   │
│   └── webapp/
│          ├── login.jsp
│          ├── dashboard.jsp
│          └── WEB-INF/
│                 └── web.xml
│
├── db/
│      ├── schema.sql
│      └── seed.sql
│
├── wsadmin/
│      ├── create_datasource.py
│      └── deploy_app.py
│
└── README.md
```

---

# Technology Stack

| Component | Version |
|------------|----------|
| Java | JDK 8 |
| Maven | 3.6+ |
| IBM WebSphere ND | 9.0.5.x |
| PostgreSQL | 12+ |
| JDBC Driver | PostgreSQL 42.7.x |
| Build Type | WAR |

---

# Prerequisites

Install the following software.

| Software | Purpose |
|-----------|----------|
| Java JDK 8 | Compile application |
| Maven | Build WAR |
| PostgreSQL | Database |
| IBM Installation Manager | Install WAS |
| IBM WebSphere ND | Application Server |
| PostgreSQL JDBC Driver | Database connectivity |

Verify installation

```bash
java -version

mvn -version

psql --version
```

---

# Install PostgreSQL

Create database

```bash
createdb nextgenbank
```

Load schema

```bash
psql -d nextgenbank -f db/schema.sql
```

Load sample data

```bash
psql -d nextgenbank -f db/seed.sql
```

Create application user

```sql
CREATE USER nextgenbank_app
WITH PASSWORD 'changeit';

GRANT ALL PRIVILEGES
ON ALL TABLES
IN SCHEMA public
TO nextgenbank_app;

GRANT USAGE,
SELECT
ON ALL SEQUENCES
IN SCHEMA public
TO nextgenbank_app;
```

Verify data

```bash
psql -U nextgenbank_app \
-d nextgenbank \
-c "SELECT username FROM customers;"
```

Expected users

```
jsmith
amiller
```

Password

```
Passw0rd!
```

---

# Build the Application

From project root

```bash
mvn clean package
```

WAR generated

```
target/nextgenbank.war
```

---

# Install PostgreSQL JDBC Driver

Download

https://jdbc.postgresql.org/download/

Copy to

```
/opt/IBM/WebSphere/jdbcdrivers/postgresql.jar
```

If your location differs, update

```
wsadmin/create_datasource.py
```

---

# Configure WebSphere

## Option 1 – Admin Console

Navigate

```
Resources
    ↓
JDBC
    ↓
JDBC Providers
```

Create PostgreSQL JDBC Provider.

Then create DataSource.

Name

```
NextGenBankDS
```

JNDI

```
jdbc/nextgenbankDS
```

Database

```
nextgenbank
```

Host

```
localhost
```

Port

```
5432
```

Username

```
nextgenbank_app
```

Password

```
changeit
```

Test Connection

Expected Result

```
Succeeded
```

---

## Option 2 – wsadmin

```bash
wsadmin.sh \
-lang jython \
-f wsadmin/create_datasource.py \
AppSrv01 \
server1
```

---

# Deploy Application

## Admin Console

```
Applications

↓

New Application

↓

Install

↓

Select nextgenbank.war

↓

Context Root

/nextgenbank

↓

Map Resource Reference

jdbc/nextgenbankDS

↓

Finish

↓

Save

↓

Start
```

---

## wsadmin Deployment

```bash
wsadmin.sh \
-lang jython \
-f wsadmin/deploy_app.py \
target/nextgenbank.war \
AppSrv01 \
server1
```

---

# Test Application

Health API

```
http://HOST:9080/nextgenbank/api/health
```

Expected

```json
{
  "status":"UP",
  "db":"UP"
}
```

Application

```
http://HOST:9080/nextgenbank/login.jsp
```

Login

Username

```
jsmith
```

Password

```
Passw0rd!
```

Test

- Login
- View balances
- Transfer funds
- Verify balances
- Verify transaction history

---

# Default WebSphere Ports

| Service | Port |
|----------|------|
| Admin Console HTTPS | 9043 |
| Admin Console HTTP | 9060 |
| Application HTTP | 9080 |
| Application HTTPS | 9443 |
| SOAP Connector | 8879 |
| PostgreSQL | 5432 |

---

# Logging Locations

```
<AppSrv01>/logs/server1/SystemOut.log

<AppSrv01>/logs/server1/SystemErr.log

<AppSrv01>/logs/server1/startServer.log

<AppSrv01>/logs/ffdc/
```

These are the primary logs used in production troubleshooting.

---

# Common Issues

| Issue | Solution |
|--------|----------|
| Connection Refused | Verify PostgreSQL is running |
| Authentication Failed | Verify database username/password |
| NameNotFoundException | Check JNDI name |
| Partial Start | Verify DataSource mapping |
| Login Failure | Reload seed.sql |
| Health API DOWN | Verify DataSource connectivity |
| HTTP 500 | Check SystemOut.log and FFDC |

---

# License

This project is intended for educational and enterprise middleware training purposes.
