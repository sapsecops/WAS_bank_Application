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
HERE we Establish Connection between Database to server-1 only, not at Profile level or Cell level or Cluater Level, its at server1 level
Meaning Server-1 only communicate with DB 
## Step:1 ===> Register It as a Shared Library 
### Method-1 ==> using Admin console
Open your browser:
```
https://dsb-dmgr.digistack.cloud:9043/ibm/console
```
Go to Shared Libraries
```
Environment
    ↓
Shared Libraries
```
At the top of the page, click Scope. and Select the application server where your application will run.
```
Node=devdsbinnode01
Server=server1
```
click on Apply

#### Enter the Details
```
Name : PostgreSQLJDBCDriver
Classpath : /apps/IBM/SharedLibs/postgresql/postgresql-42.5.4.jar
```
Leave all other fields at their defaults. and Click on "ok " and Click on "save"
### Method-2 ==> using wasadmin
1. Generate the file "register_Library.py"
```
vim register_Library.py
```
```
node = AdminConfig.getid('/Node:devdsbinnode01/')
server = AdminConfig.getid('/Node:devdsbinnode01/Server:server1/')

libAttrs = [['name', 'PostgreSQLJDBCDriver'], ['classPath', '/apps/IBM/SharedLibs/postgresql/postgresql-42.5.4.jar']]
sharedLib = AdminConfig.create('Library', server, libAttrs)

AdminConfig.save()

print "Shared Library created: " + str(sharedLib)
```
<img width="721" height="399" alt="image" src="https://github.com/user-attachments/assets/ac2c7d13-6525-4b5f-8989-4ead3142857a" />

2. Launch wasadmin to execute the script
```
/apps/IBM/WebSphere/AppServer/profiles/devdsbinappserver01/bin/wsadmin.sh -lang jython -user wasadmin -password 'Wasadmin@951951'
```
## Step:2 ==> Associate the Shared Library with server1
### Method-1 ==> using Admin console
#### Add These DB Shared Library to the Server
```
Servers
   ↓
Server Types
   ↓
WebSphere application servers
   ↓
server1

```

Open Class Loader Settings
```
Server Infrastructure

↓

Java and Process Management

↓

Class Loader
```
###### Create New Class Loader
Click on 
```
New
```
Leave the default option ==> click on "Ok"

###### open the Newly create Classloader
click on 
```
Shared Library References
```
##### Add New Shared Library
Click on 
```
Add
```
Select 
```
PostgreSQLJDBCDriver
```
Click on "ok"

Click on "Save"

### Method-2 ==> using wasadmin
1. Generate the file "attach_Library_server1.py"
```
vim attach_Library_server1.py
```
```
server = AdminConfig.getid('/Node:devdsbinnode01/Server:server1/')
sharedLib = AdminConfig.getid('/Library:PostgreSQLJDBCDriver/')

classloader = AdminConfig.create('Classloader', server, [])

libRefAttrs = [['libraryName', 'PostgreSQLJDBCDriver']]
AdminConfig.create('LibraryRef', classloader, libRefAttrs)

AdminConfig.save()

print "Class loader created and library attached: " + str(classloader)
```
<img width="726" height="257" alt="image" src="https://github.com/user-attachments/assets/12cba630-4d87-4e49-94e2-486498da9da0" />

2. Launch wasadmin to execute the script
```
/apps/IBM/WebSphere/AppServer/profiles/devdsbinappserver01/bin/wsadmin.sh -lang jython -user wasadmin -password 'Wasadmin@951951'
```

## Step:3 ==> Restart the Server to reflect the ClassLoader Changes
```
/apps/IBM/WebSphere/AppServer/profiles/devdsbinappserver01/bin/stopServer.sh server1
/apps/IBM/WebSphere/AppServer/profiles/devdsbinappserver01/bin/startServer.sh server1
```
