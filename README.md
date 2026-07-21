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
# Install PostgreSQL Clint 

```bash

sudo dnf -y module disable postgresql
sudo dnf install -y https://download.postgresql.org/pub/repos/yum/reporpms/EL-8-x86_64/pgdg-redhat-repo-latest.noarch.rpm

sudo dnf install -y postgresql15-server postgresql15

sudo /usr/pgsql-15/bin/postgresql-15-setup initdb

sudo systemctl enable postgresql-15
sudo systemctl start postgresql-15
systemctl status postgresql-15
```
# Load data to your DB
Load schema.
From your Deployment Server Load the Schema
```bash
 psql -h db01.devops.com -p 5432 -U nextgenbank_app -d nextgenbank -f db/schema.sql

 psql -h db01.devops.com -p 5432 -U nextgenbank_app -d nextgenbank -f db/seed.sql
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
wget https://jdbc.postgresql.org/download/postgresql-42.2.29.jar
mv postgresql-42.2.29.jar postgresql.jar
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
<img width="991" height="472" alt="image" src="https://github.com/user-attachments/assets/e60f69c8-7ff3-446a-b466-bb3b678c538d" />
<img width="1134" height="402" alt="image" src="https://github.com/user-attachments/assets/9473c377-7e6f-49eb-adb4-6df829758060" />


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
| Password  | wasadmin@951           |
<img width="1120" height="373" alt="image" src="https://github.com/user-attachments/assets/6d5421b4-cd21-4f74-9b96-56e4dcd27b01" />
<img width="1135" height="364" alt="image" src="https://github.com/user-attachments/assets/fa6fb11b-a500-4ec8-acff-849ee57e2264" />
<img width="1120" height="358" alt="image" src="https://github.com/user-attachments/assets/b2841c69-7a2c-413b-8c40-a90ecb54de09" />
<img width="1126" height="439" alt="image" src="https://github.com/user-attachments/assets/12238aeb-0372-4e0d-8c4b-a32fbe9d1c22" />
<img width="1011" height="297" alt="image" src="https://github.com/user-attachments/assets/f5837b7d-df82-45be-b9eb-42db929ac7fe" />
<img width="529" height="375" alt="image" src="https://github.com/user-attachments/assets/6334e3f4-85a1-4747-aa95-27b29d355397" />
<img width="1116" height="438" alt="image" src="https://github.com/user-attachments/assets/0e24bd9b-4bab-4fc1-8db2-8d64ebbe1de3" />
<img width="1129" height="432" alt="image" src="https://github.com/user-attachments/assets/1a2bca9f-2d01-4357-bd02-a9fd0e6456f1" />

<img width="1141" height="523" alt="image" src="https://github.com/user-attachments/assets/0376db22-8e73-4fc6-94ac-63269689d935" />
<img width="1096" height="838" alt="image" src="https://github.com/user-attachments/assets/b5733fd8-3600-4fc5-a745-13a652e18eb6" />
<img width="976" height="496" alt="image" src="https://github.com/user-attachments/assets/86565f37-0686-48fd-9f39-5b537e47490d" />


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
<img width="1075" height="559" alt="image" src="https://github.com/user-attachments/assets/6ee6f07f-4f11-4af7-974e-3ef502537265" />

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
