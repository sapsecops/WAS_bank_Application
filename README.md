# 🏦 NextGenBank Enterprise Banking Application

---

# Overview

NextGenBank is an enterprise banking simulation project designed for learning IBM WebSphere Application Server administration in a production-like environment.

The business functionality is intentionally simple:

* User Login
* Dashboard
* View Account Balance
* Transfer Money
* Transaction History
* Logout
* Health Check API

The primary objective is to understand enterprise middleware rather than Java development.

---

# Technology Stack

| Component          | Version                  |
| ------------------ | ------------------------ |
| Operating System   | RHEL 8                   |
| Java               | OpenJDK 8                |
| Maven              | 3.6+                     |
| Database           | PostgreSQL 15            |
| Application Server | IBM WebSphere ND 9.0.5.x |
| JDBC Driver        | PostgreSQL JDBC 42.7.x   |
| Build Tool         | Maven                    |
| Packaging          | WAR                      |

---

# Project Structure

```text
nextgenbank/
├── pom.xml
├── src/
│   ├── main/
│   │   ├── java/com/nextgenbank/
│   │   │   ├── model/
│   │   │   ├── dao/
│   │   │   ├── servlet/
│   │   │   └── util/
│   │   └── webapp/
│   │       ├── login.jsp
│   │       ├── dashboard.jsp
│   │       └── WEB-INF/
│   │           └── web.xml
├── db/
│   ├── schema.sql
│   └── seed.sql
├── wsadmin/
│   ├── create_datasource.py
│   └── deploy_app.py
└── README.md
```

---

# Enterprise Environment

```text
OS              : RHEL 8
Application User: wasadmin
Group           : wasgroup

Installation Manager
/apps/IBM/InstallationManager

Shared Resources
/apps/IBM/IMShared

WebSphere
/apps/IBM/WebSphere/AppServer

Profiles
/apps/IBM/WebSphere/AppServer/profiles

JDBC Drivers
/apps/IBM/WebSphere/jdbcdrivers
```

---

# Prerequisites

Verify the following software is installed.

```bash
java -version

mvn -version

psql --version
```

---

# Install PostgreSQL 15 (RHEL 8)

Install PostgreSQL repository.

```bash
sudo dnf install -y \
https://download.postgresql.org/pub/repos/yum/reporpms/EL-8-x86_64/pgdg-redhat-repo-latest.noarch.rpm
```

Disable the default module.

```bash
sudo dnf -qy module disable postgresql
```

Install PostgreSQL.

```bash
sudo dnf install -y postgresql15-server postgresql15
```

Initialize the database.

```bash
sudo /usr/pgsql-15/bin/postgresql-15-setup initdb
```

Enable PostgreSQL.

```bash
sudo systemctl enable postgresql-15
sudo systemctl start postgresql-15
```

Verify.

```bash
systemctl status postgresql-15
```

---

# Create Database

Become postgres.

```bash
sudo su - postgres
```

Create database.

```bash
createdb nextgenbank
```

Open PostgreSQL.

```bash
psql
```

Execute.

```sql
CREATE USER nextgenbank_app
WITH PASSWORD 'changeit';

ALTER DATABASE nextgenbank OWNER TO nextgenbank_app;
```

Exit.

```sql
\q
```

Load schema.

```bash
psql -U postgres -d nextgenbank -f db/schema.sql

psql -U postgres -d nextgenbank -f db/seed.sql
```

Default users

| Username | Password  |
| -------- | --------- |
| jsmith   | Passw0rd! |
| amiller  | Passw0rd! |

---

# Build Application

From the project directory.

```bash
mvn clean package
```

Generated artifact

```text
target/nextgenbank.war
```

---

# PostgreSQL JDBC Driver

Download the PostgreSQL JDBC driver.

Rename it to

```text
postgresql.jar
```

Copy to

```text
/apps/IBM/WebSphere/jdbcdrivers/postgresql.jar
```

Update `create_datasource.py` if you use a different location.

---

# Create JDBC Provider and DataSource

## Admin Console

Navigate to

```text
Resources
    ↓
JDBC
    ↓
JDBC Providers
```

Create a PostgreSQL JDBC Provider.

Create a DataSource with:

| Property  | Value              |
| --------- | ------------------ |
| Name      | NextGenBankDS      |
| JNDI Name | jdbc/nextgenbankDS |
| Database  | nextgenbank        |
| Host      | localhost          |
| Port      | 5432               |
| Username  | nextgenbank_app    |
| Password  | changeit           |

Click **Test Connection**.

Expected result

```text
Succeeded
```

---

## wsadmin

```bash
/apps/IBM/WebSphere/AppServer/profiles/Dmgr01/bin/wsadmin.sh \
-lang jython \
-f wsadmin/create_datasource.py \
AppSrv01 \
server1
```

---

# Deploy Application

## Admin Console

```text
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
/apps/IBM/WebSphere/AppServer/profiles/Dmgr01/bin/wsadmin.sh \
-lang jython \
-f wsadmin/deploy_app.py \
target/nextgenbank.war \
AppSrv01 \
server1
```

---

# Test the Application

Health API

```text
http://HOST:9080/nextgenbank/api/health
```

Expected

```json
{
  "status":"UP",
  "db":"UP"
}
```

Login Page

```text
http://HOST:9080/nextgenbank/login.jsp
```

Credentials

```text
Username : jsmith
Password : Passw0rd!
```

Verify

* Login
* Dashboard
* Account Balances
* Transfer Money
* Transaction History
* Logout

---

# WebSphere Log Files

```text
/apps/IBM/WebSphere/AppServer/profiles/AppSrv01/logs/server1/SystemOut.log

/apps/IBM/WebSphere/AppServer/profiles/AppSrv01/logs/server1/SystemErr.log

/apps/IBM/WebSphere/AppServer/profiles/AppSrv01/logs/server1/startServer.log

/apps/IBM/WebSphere/AppServer/profiles/AppSrv01/logs/ffdc/
```

---

# Default Ports

| Service             | Port |
| ------------------- | ---- |
| Admin Console HTTPS | 9043 |
| Admin Console HTTP  | 9060 |
| SOAP Connector      | 8879 |
| Application HTTP    | 9080 |
| Application HTTPS   | 9443 |
| PostgreSQL          | 5432 |

---

# Troubleshooting

| Problem                    | Solution                                |
| -------------------------- | --------------------------------------- |
| Database Connection Failed | Verify PostgreSQL service is running    |
| Authentication Failed      | Verify DataSource username/password     |
| NameNotFoundException      | Verify JNDI name                        |
| Partial Start              | Verify DataSource mapping               |
| HTTP 500                   | Check SystemOut.log and FFDC            |
| Login Failed               | Reload seed.sql                         |
| Health API DOWN            | Restart server after DataSource changes |

---

# Learning Objectives

This project teaches:

* WebSphere Administration
* WAR Deployment
* Maven Build Process
* PostgreSQL Integration
* JDBC Providers
* JNDI DataSources
* wsadmin Automation
* Session Management
* Production Troubleshooting
* FFDC Analysis
* Log Analysis
* Enterprise Banking Architecture

---
# License

This project is intended for educational and enterprise middleware training purposes.
