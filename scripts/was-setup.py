# =============================================================
# WAS Admin Setup Script — Jython (wsadmin)
# Run: wsadmin.sh -lang jython -username wasadmin -password Admin@12345 -f was-setup.py
# =============================================================

import sys

# ---------- Configuration ----------
SERVER_NAME   = 'BankingServer'
NODE_NAME     = 'wasNode01'
CELL_NAME     = AdminControl.getCell()
JDBC_JAR      = '/opt/IBM/WebSphere/AppServer/lib/ext/postgresql/postgresql-42.7.3.jar'
DB_HOST       = 'localhost'
DB_PORT       = '5432'
DB_NAME       = 'bankingdb'
J2C_ALIAS     = 'BankingDB_Auth'
J2C_USER      = 'bankadmin'
J2C_PASSWORD  = 'Bank@12345'
DS_NAME       = 'BankingDS'
DS_JNDI       = 'jdbc/BankingDS'
PROVIDER_NAME = 'PostgreSQL JDBC Provider'
SHARED_LIB    = 'PostgreSQLLib'

print('=== Banking WAS Setup Script Starting ===')
print('Cell:', CELL_NAME, ' Node:', NODE_NAME, ' Server:', SERVER_NAME)

# ---------- Step 1: Create J2C Authentication Alias ----------
print('\n[1] Creating J2C authentication alias...')
security = AdminConfig.getid('/Cell:' + CELL_NAME + '/Security:/')
jaasEntries = AdminConfig.list('JAASAuthData', security)

aliasExists = False
for entry in jaasEntries.splitlines():
    if J2C_ALIAS in AdminConfig.showAttribute(entry, 'alias'):
        aliasExists = True
        print('  J2C alias already exists, skipping.')
        break

if not aliasExists:
    attrs = [['alias', CELL_NAME + '/' + J2C_ALIAS],
             ['userId',   J2C_USER],
             ['password', J2C_PASSWORD],
             ['description', 'Banking PostgreSQL credentials']]
    AdminConfig.create('JAASAuthData', security, attrs)
    print('  J2C alias created: ' + J2C_ALIAS)

# ---------- Step 2: Create Shared Library for JDBC JAR ----------
print('\n[2] Creating shared library for PostgreSQL JDBC driver...')
cellId = AdminConfig.getid('/Cell:' + CELL_NAME + '/')
libAttrs = [['name',      SHARED_LIB],
            ['classPath', JDBC_JAR],
            ['description', 'PostgreSQL 42.x JDBC driver for BankingApp']]
AdminConfig.create('Library', cellId, libAttrs)
print('  Shared library created: ' + SHARED_LIB)

# ---------- Step 3: Create JDBC Provider ----------
print('\n[3] Creating JDBC provider...')
nodeId = AdminConfig.getid('/Cell:' + CELL_NAME + '/Node:' + NODE_NAME + '/')
providerAttrs = [
    ['name',            PROVIDER_NAME],
    ['description',     'PostgreSQL XA JDBC Provider for Banking'],
    ['classpath',       JDBC_JAR],
    ['implementationClassName', 'org.postgresql.xa.PGXADataSource'],
    ['providerType',    'User-Defined JDBC Provider']
]
provider = AdminConfig.create('JDBCProvider', nodeId, providerAttrs)
print('  JDBC provider created.')

# ---------- Step 4: Create XA DataSource ----------
print('\n[4] Creating datasource ' + DS_JNDI + '...')
dsAttrs = [
    ['name',                 DS_NAME],
    ['jndiName',             DS_JNDI],
    ['description',          'Banking PostgreSQL XA DataSource'],
    ['authDataAlias',        CELL_NAME + '/' + J2C_ALIAS],
    ['xaRecoveryAuthAlias',  CELL_NAME + '/' + J2C_ALIAS]
]
ds = AdminConfig.create('DataSource', provider, dsAttrs)

# Custom properties
propSet = AdminConfig.create('J2EEResourcePropertySet', ds, [])
def addProp(name, value, type='java.lang.String'):
    AdminConfig.create('J2EEResourceProperty', propSet,
        [['name', name], ['value', value], ['type', type]])

addProp('serverName',  DB_HOST)
addProp('portNumber',  DB_PORT,  'java.lang.Integer')
addProp('databaseName', DB_NAME)
print('  DataSource created with custom properties.')

# ---------- Step 5: Configure Connection Pool ----------
print('\n[5] Tuning connection pool...')
pool = AdminConfig.list('ConnectionPool', ds)
if pool:
    AdminConfig.modify(pool, [
        ['minConnections',     5],
        ['maxConnections',    30],
        ['connectionTimeout', 180],
        ['idleTimeout',      1800],
        ['reapTime',          180],
        ['unusedTimeout',     600],
        ['purgePolicy',       'FailingConnectionOnly']
    ])
    print('  Connection pool tuned: min=5 max=30 timeout=180s')

# ---------- Step 6: Configure JVM Heap ----------
print('\n[6] Setting JVM heap and GC policy...')
serverId = AdminConfig.getid(
    '/Cell:' + CELL_NAME + '/Node:' + NODE_NAME
    + '/Server:' + SERVER_NAME + '/')
jvm = AdminConfig.list('JavaVirtualMachine', serverId)
AdminConfig.modify(jvm, [
    ['initialHeapSize', 512],
    ['maximumHeapSize', 2048],
    ['genericJvmArguments',
     '-Xgcpolicy:gencon -Xmn256m -verbose:gc -Xdump:heap:events=systhrow,filter=java/lang/OutOfMemoryError']
])
print('  JVM: -Xms512m -Xmx2048m -Xgcpolicy:gencon')

# ---------- Step 7: Configure Thread Pool ----------
print('\n[7] Tuning thread pools...')
threadPools = AdminConfig.list('ThreadPool', serverId).splitlines()
for tp in threadPools:
    tpName = AdminConfig.showAttribute(tp, 'name')
    if tpName == 'WebContainer':
        AdminConfig.modify(tp, [['minimumSize', 10], ['maximumSize', 75]])
        print('  WebContainer thread pool: min=10 max=75')
    elif tpName == 'ORB.thread.pool':
        AdminConfig.modify(tp, [['minimumSize', 10], ['maximumSize', 50]])
        print('  ORB thread pool: min=10 max=50')

# ---------- Save ----------
print('\n[8] Saving configuration...')
AdminConfig.save()
print('\n=== Setup complete. Restart the server for JVM changes to take effect. ===')
print('Run: ./stopServer.sh BankingServer && ./startServer.sh BankingServer')
