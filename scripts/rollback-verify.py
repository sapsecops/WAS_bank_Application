# =============================================================
# rollback.py — Undeploy BankingApp from WAS
# Run: wsadmin.sh -lang jython -username wasadmin -password Admin@12345 -f rollback.py
# =============================================================

APP_NAME = 'BankingApp'
NODE     = 'wasNode01'
SERVER   = 'BankingServer'

print('=== Rolling back', APP_NAME, '===')

try:
    AdminApplication.stopApplicationOnSingleServer(APP_NAME, NODE, SERVER)
    print('Application stopped.')
except Exception as e:
    print('Stop skipped (may already be stopped):', str(e))

try:
    AdminApp.uninstall(APP_NAME)
    AdminConfig.save()
    print('Application uninstalled successfully.')
except Exception as e:
    print('Uninstall error:', str(e))

print('=== Rollback complete ===')


# =============================================================
# verify-ds.py — Test datasource connectivity from wsadmin
# Run: wsadmin.sh -lang jython -username wasadmin -password Admin@12345 -f verify-ds.py
# =============================================================

print('\n=== Verifying DataSource ===')

try:
    ds = AdminControl.queryNames(
        'type=DataSource,name=BankingDS,*').splitlines()[0]
    result = AdminControl.invoke(ds, 'testConnection')
    print('DataSource test result:', result)
    if 'successful' in result.lower():
        print('=== DataSource OK ===')
    else:
        print('=== DataSource FAILED — check credentials and pg_hba.conf ===')
except Exception as e:
    print('DataSource verify error:', str(e))
    print('Ensure WAS server is running and datasource is configured.')
