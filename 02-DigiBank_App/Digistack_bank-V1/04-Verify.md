# Befor do Experiments Take Backup
## Take the Existing Application Backup
```
mkdir -p /opt/backups
/apps/IBM/WebSphere/AppServer/profiles/devdsbinappserver01/bin/backupConfig.sh /opt/backups/v1-baseline-config.zip
ls -la /opt/backups/v1-baseline-config.zip
```

# Verification -1
Here we verify the Application content will fetch from DB or Not by Crashing the DB

## Stop the Database
01- stop the DB
```
sudo systemctl stop postgresql-16
```
02-Refresh the Browser
```
http://dsb-dmgr.digistack.cloud:9080/digistack-bank/
```
Expected result: Page still renders (doesn't crash/blank-screen), showing a red "DB Read Failed:" message with the actual connection error text.
## start the Database
01- start the DB
```
sudo systemctl start postgresql-16
```
02-Refresh the Browser
```
http://dsb-dmgr.digistack.cloud:9080/digistack-bank/
```
Expected result: Page now shows "DigiStack Bank is live - Version 1"

# Verification -2
Here we verify the Application content will fetch from DB or Not by changing the Data in DB

## Prove the Page Shows Live Data
01- Update Data in Database from dsb-db
```

sudo -u postgres psql -d digistack_bank -c "UPDATE app_config SET config_value = 'Dont worry App Fetch from DB' WHERE config_key = 'welcome_message';"
```
02-Refresh the Browser
```
http://dsb-dmgr.digistack.cloud:9080/digistack-bank/
```
Expected result: Page now shows "Dont worry App Fetch from DB"

03 - Put the Original Value Back in Database from dsb-db
```
sudo -u postgres psql -d digistack_bank -c "UPDATE app_config SET config_value = 'DigiStack Bank is live - Version 1' WHERE config_key = 'welcome_message';"
```
02-Refresh the Browser
```
http://dsb-dmgr.digistack.cloud:9080/digistack-bank/
```
Expected result: Page now shows "DigiStack Bank is live - Version 1"

