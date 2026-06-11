# =============================================================
# deploy.py — Deploy BankingApp.ear to WAS
# Run: wsadmin.sh -lang jython -username wasadmin -password Admin@12345 -f deploy.py
# =============================================================

import sys, time

EAR_PATH  = '/opt/deployments/BankingApp.ear'
APP_NAME  = 'BankingApp'
SERVER    = 'BankingServer'
NODE      = 'wasNode01'

def waitForApp(appName, targetState='true', timeoutSec=120):
    elapsed = 0
    while elapsed < timeoutSec:
        state = AdminApp.isAppReady(appName)
        if state == targetState:
            return True
        time.sleep(5)
        elapsed += 5
    return False

print('=== Deploying', APP_NAME, '===')

# Stop existing app if running
try:
    if AdminApp.isAppReady(APP_NAME) == 'true':
        print('Stopping existing application...')
        AdminApplication.stopApplicationOnSingleServer(APP_NAME, NODE, SERVER)
        time.sleep(5)
except:
    pass

# Uninstall if exists
try:
    existingApps = AdminApp.list().splitlines()
    if APP_NAME in existingApps:
        print('Uninstalling previous version...')
        AdminApp.uninstall(APP_NAME)
        AdminConfig.save()
        time.sleep(3)
except Exception as e:
    print('Uninstall skipped:', str(e))

# Install new EAR
print('Installing', EAR_PATH, '...')
AdminApp.install(EAR_PATH, [
    '-appname',        APP_NAME,
    '-server',         SERVER,
    '-node',           NODE,
    '-contextroot',    '/banking',
    '-MapWebModToVH',  [['BankingWeb', 'BankingWeb.war', 'default_host']],
    '-MapResRefToEJB', [
        ['BankingEJB',  'com.banking.ejb.AccountServiceBean',
         'jdbc/BankingDS', 'javax.sql.DataSource', 'jdbc/BankingDS', ''],
        ['BankingEJB',  'com.banking.ejb.CustomerServiceBean',
         'jdbc/BankingDS', 'javax.sql.DataSource', 'jdbc/BankingDS', ''],
        ['BankingWeb',  'com.banking.web.servlet.HealthCheckServlet',
         'jdbc/BankingDS', 'javax.sql.DataSource', 'jdbc/BankingDS', '']
    ],
    '-SharedLibRelationship', [[APP_NAME, '', 'PostgreSQLLib', '', '']]
])

AdminConfig.save()
print('Installation complete. Starting application...')

AdminApplication.startApplicationOnSingleServer(APP_NAME, NODE, SERVER)

if waitForApp(APP_NAME, 'true', 120):
    print('\n=== DEPLOYMENT SUCCESSFUL ===')
    print('Health check: http://localhost:9080/banking/health')
else:
    print('\n=== WARNING: App may not have started. Check SystemOut.log ===')
