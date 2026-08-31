# Deploy the Schema to DB from DMGR VM
## Deploy from Deploy server

#### Install PostgreSQL Clint 

```
sudo dnf -qy module disable postgresql
sudo dnf install -y https://download.postgresql.org/pub/repos/yum/reporpms/EL-8-x86_64/pgdg-redhat-repo-latest.noarch.rpm

sudo dnf install -y postgresql16-server postgresql16-contrib

sudo /usr/pgsql-15/bin/postgresql-15-setup initdb

sudo systemctl enable postgresql-16
sudo systemctl start postgresql-16
```
```
psql -h 192.168.10.30 -U digistack_app -d digistack_bank -f V1__create_app_config.sql
```
#### Verification
```
psql -h 192.168.10.30 -U digistack_app -d digistack_bank -c "SELECT * FROM app_config;"
```
Expected output:
```
id | config_key      | config_value                          | created_at
----+-----------------+---------------------------------------+-------------------
  1 | welcome_message | DigiStack Bank is live - Version 1     | <timestamp>
```

# Setup PostgreSQL JDBC Driver

Download the PostgreSQL JDBC driver.
```
wget https://jdbc.postgresql.org/download/postgresql-42.7.3.jar

```
Create Directory for postgresql driver 

```
sudo mkdir -p /apps/IBM/SharedLibs/postgresql
```

Copy to

```
sudo mv postgresql-42.7.3.jar /apps/IBM/SharedLibs/postgresql/
sudo chown wasadmin:wasgrp /apps/IBM/SharedLibs/postgresql/postgresql-42.7.3.jar
```
# Establish Connection Between DB to Server-1 
## Create JDBC Provider and DataSource

### Admin Console

Navigate to

```text
Resources
    ↓
JDBC
    ↓
JDBC Providers
```
For your lab, if you have a single server, you can use:
```
Node = your WebSphere node
Server = your application server
```

Click:
```
New
```

### Select PostgreSQL JDBC provider

You may see fields such as:
Create a PostgreSQL JDBC Provider.

| Property  | Value                |
| --------- | -------------------- |
| Name      | DigiStackBankDS      |
| JNDI Name | jdbc/DigiStackBankDS |
| Database  | digistack_bank       |
| Host      | 192.168.10.30        |
| Port      | 5432                 |
| Username  | digistack_app        |
| Password  | wasadmin@951951      |


### Configure the JDBC driver classpath

```
 /apps/IBM/SharedLibs/postgresql/postgresql-42.7.3.jar
```

goto 
```
WebSphere
   │
   ▼
JDBC Provider
   │
   └── Classpath
          │
          └── postgresql-42.x.x.jar
```
Save & configure
