# NextGenBank Enterprise Banking Application

## INSTALLATION_GUIDE.md

> **Platform**
>
> - IBM WebSphere Application Server ND 9.0.5.x
> - RHEL 8
> - PostgreSQL 15
> - Java 8
> - Maven 3.6+

---

# 1. Introduction

This guide explains how to install and configure the complete NextGenBank lab environment on **RHEL 8** using **IBM WebSphere ND 9.0.5.x** and **PostgreSQL 15**.

---

# 2. Environment Requirements

| Component | Version |
|-----------|---------|
| OS | RHEL 8 |
| Java | OpenJDK 8 |
| Maven | 3.6+ |
| Database | PostgreSQL 15 |
| WebSphere | IBM WAS ND 9.0.5.x |

---

# 3. RHEL 8 Preparation

## Create WebSphere User

```bash
sudo groupadd wasgroup
sudo useradd -g wasgroup -m -s /bin/bash wasadmin
sudo passwd wasadmin
```

## Create Installation Directories

```bash
sudo mkdir -p /apps/IBM
sudo chown -R wasadmin:wasgroup /apps/IBM
```

Directory layout:

```text
/apps
└── IBM
    ├── InstallationManager
    ├── IMShared
    ├── WebSphere
    │   ├── AppServer
    │   ├── jdbcdrivers
    │   └── profiles
    └── HTTPServer
```

## Configure Hostname

```bash
sudo hostnamectl set-hostname dmgr.devops.com
hostname -f
```

## Configure /etc/hosts

```text
192.168.10.10 dmgr.devops.com dmgr
192.168.10.11 app01.devops.com app01
192.168.10.20 db.devops.com db
```

## Configure Time Synchronization

```bash
sudo systemctl enable chronyd
sudo systemctl start chronyd

chronyc tracking
chronyc sources -v
```

---

# 4. Install Java

```bash
sudo dnf install -y java-1.8.0-openjdk-devel
java -version
```

---

# 5. Install Maven

```bash
sudo dnf install -y maven
mvn -version
```

---

# 6. Install PostgreSQL 15

```bash

sudo dnf -qy module disable postgresql
sudo dnf install -y https://download.postgresql.org/pub/repos/yum/reporpms/EL-8-x86_64/pgdg-redhat-repo-latest.noarch.rpm

sudo dnf install -y postgresql15-server postgresql15

sudo /usr/pgsql-15/bin/postgresql-15-setup initdb

sudo systemctl enable postgresql-15
sudo systemctl start postgresql-15
systemctl status postgresql-15
```
## Setup postgressql DB

#### Allow Remote Host connect to DB
1. Edit the "postgresql.conf" file in path "/var/lib/pgsql/data/postgresql.conf"
```
sudo vim /var/lib/pgsql/15/data/postgresql.conf
```
ADD these Under connection settings
```
listen_addresses = '*'
```

2. Edit the "pg_hba.conf" file in path "/var/lib/pgsql/data/pg_hba.conf"

```
sudo vim /var/lib/pgsql/15/data/pg_hba.conf
```
Edit IPV4 Local Connection Method from ident to md5 these lines 
```
# IPv4 local connections:
host    all             all             127.0.0.1/32            md5
```
ADD these lines 
```
# Allow remote user connections from a single IP
host    all             all             0.0.0.0/0          md5
```
Restart postgressql DB
```
sudo systemctl restart postgresql-15
```


---

# 7. Configure PostgreSQL

```bash
sudo su - postgres
createdb nextgenbank
psql
```

```sql
CREATE USER nextgenbank_app WITH PASSWORD 'wasadmin@951';
ALTER DATABASE nextgenbank OWNER TO nextgenbank_app;

\c nextgenbank

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO nextgenbank_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO nextgenbank_app;
```

---

# 8. Firewall Configuration

```bash
sudo firewall-cmd --permanent --add-service=postgresql

sudo firewall-cmd --permanent --add-port=9043/tcp
sudo firewall-cmd --permanent --add-port=9060/tcp
sudo firewall-cmd --permanent --add-port=9080/tcp
sudo firewall-cmd --permanent --add-port=9443/tcp
sudo firewall-cmd --permanent --add-port=8879/tcp

sudo firewall-cmd --reload
```

Lab only:

```bash
sudo systemctl stop firewalld
sudo systemctl disable firewalld
```

---

# 9. SELinux

```bash
getenforce
sudo setenforce 0
sudo vi /etc/selinux/config
```

Change:

```text
SELINUX=enforcing
```

to

```text
SELINUX=disabled
```

Reboot:

```bash
sudo reboot
```

---

# 10. IBM Installation Manager

Install IBM Installation Manager under:

```text
/apps/IBM/InstallationManager
```

Use:

```text
/apps/IBM/IMShared
```

for shared resources.

---

# 11. WebSphere ND Installation

Install IBM WebSphere ND into:

```text
/apps/IBM/WebSphere/AppServer
```

---

# 12. Create Profiles

```bash
/apps/IBM/WebSphere/AppServer/bin/manageprofiles.sh
```

Create:

- Dmgr01
- AppSrv01

---

# 13. Federate Node

```bash
/apps/IBM/WebSphere/AppServer/profiles/AppSrv01/bin/addNode.sh dmgr.devops.com 8879
```

Start services:

```bash
startManager.sh
startNode.sh
startServer.sh server1
```

---


# 14. Default Ports

| Service | Port |
|----------|------|
| Admin HTTPS | 9043 |
| Admin HTTP | 9060 |
| SOAP | 8879 |
| HTTP | 9080 |
| HTTPS | 9443 |
| PostgreSQL | 5432 |

---

# 15. Troubleshooting

- Verify hostname resolution.
- Verify PostgreSQL is running.
- Verify JDBC driver path.
- Verify JNDI name.
- Review SystemOut.log and FFDC.
- Test DataSource before deployment.

---

