import { useState, useEffect, useRef } from "react";

const SECTIONS = [
  { id: "overview", label: "Architecture Overview", icon: "🏛️" },
  { id: "ihs-was", label: "IHS → WAS Routing", icon: "🔀" },
  { id: "jdbc", label: "JDBC Datasource Tuning", icon: "🗄️" },
  { id: "mq", label: "MQ Integration", icon: "📨" },
  { id: "cluster", label: "Cluster Failover", icon: "⚙️" },
  { id: "jvm", label: "JVM Troubleshooting", icon: "🔧" },
  { id: "ssl", label: "SSL / Security", icon: "🔐" },
  { id: "production", label: "Production Support", icon: "🚨" },
  { id: "heap", label: "Thread / Heap Analysis", icon: "📊" },
  { id: "wsadmin", label: "wsadmin Scripting", icon: "💻" },
  { id: "txflow", label: "Banking Transaction Flow", icon: "💳" },
  { id: "postgresql", label: "PostgreSQL DAO Layer", icon: "🐘" },
];

const CODE = {
  "ihs-was": {
    title: "IHS → WAS Plugin Configuration",
    tabs: [
      {
        label: "plugin-cfg.xml",
        lang: "xml",
        code: `<!-- /opt/IBM/HTTPServer/Plugins/config/webserver1/plugin-cfg.xml -->
<!-- 10-YEAR PRO TIP: Always tune ServerIOTimeout & RetryInterval for banking SLAs -->

<Config ASDisableNagle="false" AcceptAllContent="false"
        AppServerPortPreference="HostHeader"
        ChunkedResponse="false"
        FIPSEnable="false"
        IISDisableNagle="false"
        IISPluginPriority="High"
        IgnoreDNSFailures="false"
        RefreshInterval="60"
        ResponseChunkSize="64"
        VHostMatchingCompat="false">

  <!-- BANKING CLUSTER: Round-robin with sticky sessions -->
  <ServerCluster CloneSeparatorChange="false"
                 GetDWLMTable="false"
                 IgnoreAffinityRequests="true"
                 LoadBalance="RoundRobin"
                 Name="BankingCluster_Cluster"
                 PostSizeLimit="-1"
                 RemoveSpecialHeaders="true"
                 RetryInterval="60">

    <!-- PRIMARY NODE -->
    <Server CloneID="1001"
            ConnectTimeout="5"
            ExtendedHandshake="false"
            MaxConnections="-1"
            Name="banknode01_BankAppServer1"
            ServerIOTimeout="900"
            WaitForContinue="false">
      <Transport Hostname="banknode01.prod.bank.com"
                 Port="9080"
                 Protocol="http"/>
      <Transport Hostname="banknode01.prod.bank.com"
                 Port="9443"
                 Protocol="https">
        <Property Name="keyring"
                  Value="/opt/IBM/HTTPServer/Plugins/etc/plugin-key.kdb"/>
        <Property Name="stashfile"
                  Value="/opt/IBM/HTTPServer/Plugins/etc/plugin-key.sth"/>
      </Transport>
    </Server>

    <!-- SECONDARY NODE (Failover) -->
    <Server CloneID="1002"
            ConnectTimeout="5"
            ExtendedHandshake="false"
            MaxConnections="-1"
            Name="banknode02_BankAppServer2"
            ServerIOTimeout="900"
            WaitForContinue="false">
      <Transport Hostname="banknode02.prod.bank.com"
                 Port="9080"
                 Protocol="http"/>
    </Server>

    <!-- PRIMARY SERVER PREFERRED — failover to secondary -->
    <PrimaryServers>
      <Server Name="banknode01_BankAppServer1"/>
    </PrimaryServers>
    <BackupServers>
      <Server Name="banknode02_BankAppServer2"/>
    </BackupServers>
  </ServerCluster>

  <!-- SESSION AFFINITY: Critical for banking state -->
  <UriGroup Name="BankingApp_URIGroup">
    <Uri AffinityCookie="JSESSIONID"
         AffinityURLIdentifier="jsessionid"
         Name="/BankingApp/*"/>
    <Uri AffinityCookie="JSESSIONID"
         AffinityURLIdentifier="jsessionid"
         Name="/BankingServices/*"/>
  </UriGroup>

  <Route ServerCluster="BankingCluster_Cluster"
         UriGroup="BankingApp_URIGroup"
         VirtualHostGroup="BankingVHosts_HostGroup"/>
</Config>`,
      },
      {
        label: "httpd.conf",
        lang: "apache",
        code: `# /opt/IBM/HTTPServer/conf/httpd.conf
# Banking-grade IHS configuration

ServerName bankportal.prod.bank.com
ServerTokens Prod          # Hide server version (security)
ServerSignature Off
TraceEnable Off            # Disable TRACE (banking security req)

# --- WAS Plugin ---
LoadModule was_ap22_module /opt/IBM/HTTPServer/Plugins/bin/64bits/mod_was_ap22_http.so
WebSpherePluginConfig /opt/IBM/HTTPServer/Plugins/config/webserver1/plugin-cfg.xml

# --- SSL/TLS: Banking mandates TLS 1.2+ ---
LoadModule ibm_ssl_module modules/mod_ibm_ssl.so
<IfModule mod_ibm_ssl.c>
  Listen 0.0.0.0:443
  <VirtualHost *:443>
    ServerName bankportal.prod.bank.com
    SSLEnable
    SSLProtocolDisable SSLv2 SSLv3 TLSv10 TLSv11
    SSLCipherSpec TLS_RSA_WITH_AES_256_GCM_SHA384
    SSLCipherSpec TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384
    KeyFile /opt/IBM/HTTPServer/certs/banking-keystore.kdb
    SSLStashFile /opt/IBM/HTTPServer/certs/banking-keystore.sth
    SSLClientAuth None
    CustomLog /opt/IBM/HTTPServer/logs/ssl_access_log combined
  </VirtualHost>
</IfModule>

# --- Security Headers (PCI-DSS compliance) ---
Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
Header always set X-Content-Type-Options "nosniff"
Header always set X-Frame-Options "DENY"
Header always set X-XSS-Protection "1; mode=block"
Header always set Cache-Control "no-store, no-cache"
Header always unset X-Powered-By

# --- Performance: Keep-Alive for banking API calls ---
KeepAlive On
MaxKeepAliveRequests 100
KeepAliveTimeout 15

# --- Logging: Required for audit trail ---
LogFormat "%h %l %u %t \\"%r\\" %>s %b %D \\"%{Referer}i\\" \\"%{User-Agent}i\\"" banking_combined
CustomLog /opt/IBM/HTTPServer/logs/access_log banking_combined`,
      },
    ],
  },
  jdbc: {
    title: "JDBC Datasource & Connection Pool Tuning",
    tabs: [
      {
        label: "DataSource wsadmin",
        lang: "python",
        code: `# wsadmin Jython: Create production-tuned PostgreSQL DataSource
# Run: wsadmin.sh -lang jython -f create_datasource.py

import sys

def createBankingDataSource():
    cell = AdminConfig.getid('/Cell:BankingCell/')
    cluster = AdminConfig.getid('/Cell:BankingCell/ServerCluster:BankingCluster/')
    
    # --- JDBC Provider ---
    jdbcAttrs = [
        ['name',            'PostgreSQL JDBC Provider'],
        ['implementationClassName', 'org.postgresql.ds.PGConnectionPoolDataSource'],
        ['classpath',       '${BANKING_LIB}/postgresql-42.7.3.jar'],
        ['description',     'PostgreSQL 15 - Banking Production'],
    ]
    jdbcProvider = AdminConfig.create('JDBCProvider', cluster, jdbcAttrs)
    print("Created JDBC Provider: " + jdbcProvider)

    # --- DataSource ---
    dsAttrs = [
        ['name',            'BankingDS'],
        ['jndiName',        'jdbc/BankingDS'],
        ['description',     'Banking PostgreSQL DataSource'],
        ['authDataAlias',   'BankingCell/banking_db_auth'],
        ['datasourceHelperClassname',
         'com.ibm.websphere.rsadapter.GenericDataStoreHelper'],
    ]
    ds = AdminConfig.create('DataSource', jdbcProvider, dsAttrs)

    # --- Connection Pool: CRITICAL for banking throughput ---
    # Rule of thumb: min=10, max=(CPU_cores * 10), reap=180s
    cpAttrs = [
        ['connectionTimeout',    180],   # Wait 3min before ConnTimeout
        ['maxConnections',       50],    # Max pool size (tune per load test)
        ['minConnections',       10],    # Pre-warmed connections
        ['reapTime',             180],   # Idle scan interval (seconds)
        ['unusedTimeout',        1800],  # Kill idle after 30min
        ['agedTimeout',          10800], # Force refresh after 3hrs
        ['purgePolicy',          'EntirePool'],  # On stale: purge all (banking safety)
        ['numberOfUnsharedPoolPartitions', 0],
        ['numberOfSharedPoolPartitions',   0],
        ['numberOfFreePoolPartitions',     0],
    ]
    pool = AdminConfig.showAttribute(ds, 'connectionPool')
    AdminConfig.modify(pool, cpAttrs)

    # --- Custom Properties for PostgreSQL ---
    propsMap = {
        'serverName':           'pgcluster.prod.bank.com',
        'portNumber':           '5432',
        'databaseName':         'banking_core',
        'currentSchema':        'banking',
        'ssl':                  'true',
        'sslmode':              'verify-full',
        'sslcert':              '/opt/bank/certs/pg-client.crt',
        'sslkey':               '/opt/bank/certs/pg-client.key',
        'sslrootcert':          '/opt/bank/certs/pg-root-ca.crt',
        'connectTimeout':       '10',
        'socketTimeout':        '300',
        'ApplicationName':      'BankingEAR-WAS',
        'prepareThreshold':     '5',   # Server-side prepared stmts after 5 execs
        'preparedStatementCacheQueries': '256',
        'tcpKeepAlive':         'true',
    }
    
    for key, val in propsMap.items():
        propAttrs = [['name', key], ['value', val], ['type', 'java.lang.String']]
        AdminConfig.create('J2EEResourceProperty',
                           AdminConfig.showAttribute(ds, 'propertySet'),
                           propAttrs)

    AdminConfig.save()
    print("BankingDS created and saved successfully.")
    
    # --- Test the connection ---
    AdminControl.invoke(ds, 'testConnection', '', '')
    print("Connection test PASSED.")

createBankingDataSource()`,
      },
      {
        label: "BankingDAO.java",
        lang: "java",
        code: `package com.bank.dao;

import javax.annotation.Resource;
import javax.ejb.Stateless;
import javax.ejb.TransactionAttribute;
import javax.ejb.TransactionAttributeType;
import javax.sql.DataSource;
import java.math.BigDecimal;
import java.sql.*;
import java.util.ArrayList;
import java.util.List;
import java.util.logging.Logger;

/**
 * Banking DAO - PostgreSQL via WAS JDBC DataSource
 * 
 * 10-YR PRO NOTES:
 *  - Never hold Connection outside try-with-resources (pool leak!)
 *  - Use PreparedStatement always (SQL injection + parse caching)
 *  - SET search_path in connection init for schema isolation
 *  - Log slow queries >500ms for DBA review
 */
@Stateless
public class BankingDAO {

    private static final Logger log = Logger.getLogger(BankingDAO.class.getName());
    private static final long SLOW_QUERY_THRESHOLD_MS = 500;

    @Resource(name = "jdbc/BankingDS", lookup = "jdbc/BankingDS")
    private DataSource dataSource;

    // ---------------------------------------------------------------
    // ACCOUNT BALANCE (Read — use READ COMMITTED isolation)
    // ---------------------------------------------------------------
    public BigDecimal getAccountBalance(String accountId) throws SQLException {
        String sql = "SELECT balance FROM banking.accounts " +
                     "WHERE account_id = ? AND status = 'ACTIVE' FOR SHARE";
        
        long start = System.currentTimeMillis();
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            
            conn.setTransactionIsolation(Connection.TRANSACTION_READ_COMMITTED);
            ps.setString(1, accountId);
            ps.setQueryTimeout(30); // 30-second query timeout
            
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return rs.getBigDecimal("balance");
                }
                throw new SQLException("Account not found: " + accountId);
            }
        } finally {
            logSlowQuery("getAccountBalance", start);
        }
    }

    // ---------------------------------------------------------------
    // FUNDS TRANSFER (Write — SERIALIZABLE for banking correctness)
    // ---------------------------------------------------------------
    @TransactionAttribute(TransactionAttributeType.REQUIRED)
    public void transferFunds(String fromAccountId, String toAccountId,
                               BigDecimal amount, String txnRef) throws SQLException {

        // Lock accounts in consistent order to prevent deadlock
        String lockSql = "SELECT account_id, balance FROM banking.accounts " +
                         "WHERE account_id = ANY(?) ORDER BY account_id FOR UPDATE";
        
        String debitSql  = "UPDATE banking.accounts SET balance = balance - ?, " +
                           "updated_at = NOW() WHERE account_id = ? AND balance >= ?";
        String creditSql = "UPDATE banking.accounts SET balance = balance + ?, " +
                           "updated_at = NOW() WHERE account_id = ?";
        String txnSql    = "INSERT INTO banking.transactions " +
                           "(txn_ref, from_account, to_account, amount, status, created_at) " +
                           "VALUES (?, ?, ?, ?, 'COMPLETED', NOW())";
        
        long start = System.currentTimeMillis();
        try (Connection conn = dataSource.getConnection()) {
            conn.setAutoCommit(false); // CMT handles this via EJB — illustrative only
            conn.setTransactionIsolation(Connection.TRANSACTION_SERIALIZABLE);
            
            try {
                // Lock both rows deterministically (prevents deadlock)
                Array accountArray = conn.createArrayOf("varchar",
                    new Object[]{fromAccountId, toAccountId});
                try (PreparedStatement lockPs = conn.prepareStatement(lockSql)) {
                    lockPs.setArray(1, accountArray);
                    lockPs.executeQuery(); // Acquires row-level locks
                }
                
                // Debit source (balance check inline — atomic)
                try (PreparedStatement ps = conn.prepareStatement(debitSql)) {
                    ps.setBigDecimal(1, amount);
                    ps.setString(2, fromAccountId);
                    ps.setBigDecimal(3, amount); // Insufficient funds check
                    int rows = ps.executeUpdate();
                    if (rows == 0) throw new SQLException("INSUFFICIENT_FUNDS: " + fromAccountId);
                }
                
                // Credit destination
                try (PreparedStatement ps = conn.prepareStatement(creditSql)) {
                    ps.setBigDecimal(1, amount);
                    ps.setString(2, toAccountId);
                    ps.executeUpdate();
                }
                
                // Audit trail
                try (PreparedStatement ps = conn.prepareStatement(txnSql)) {
                    ps.setString(1, txnRef);
                    ps.setString(2, fromAccountId);
                    ps.setString(3, toAccountId);
                    ps.setBigDecimal(4, amount);
                    ps.executeUpdate();
                }
                
                conn.commit();
                log.info("Transfer committed: " + txnRef + " amount=" + amount);
                
            } catch (SQLException e) {
                conn.rollback();
                log.severe("Transfer ROLLED BACK: " + txnRef + " - " + e.getMessage());
                throw e;
            }
        } finally {
            logSlowQuery("transferFunds", start);
        }
    }

    // ---------------------------------------------------------------
    // STATEMENT (Batch Read — use server-side cursor for large result sets)
    // ---------------------------------------------------------------
    public List<Transaction> getStatement(String accountId, int months) throws SQLException {
        String sql = "SELECT txn_ref, amount, txn_type, description, created_at " +
                     "FROM banking.transactions " +
                     "WHERE (from_account = ? OR to_account = ?) " +
                     "  AND created_at >= NOW() - INTERVAL '? months' " +
                     "ORDER BY created_at DESC";
        
        List<Transaction> results = new ArrayList<>();
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql,
                     ResultSet.TYPE_FORWARD_ONLY, ResultSet.CONCUR_READ_ONLY)) {
            
            conn.setAutoCommit(false); // Required for server-side cursor
            ps.setFetchSize(100);      // Streaming cursor — avoids OOM on large statements
            ps.setString(1, accountId);
            ps.setString(2, accountId);
            ps.setInt(3, months);
            
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    results.add(new Transaction(
                        rs.getString("txn_ref"),
                        rs.getBigDecimal("amount"),
                        rs.getString("txn_type"),
                        rs.getString("description"),
                        rs.getTimestamp("created_at")
                    ));
                }
            }
        }
        return results;
    }

    private void logSlowQuery(String method, long startMs) {
        long elapsed = System.currentTimeMillis() - startMs;
        if (elapsed > SLOW_QUERY_THRESHOLD_MS) {
            log.warning("SLOW QUERY [" + method + "] took " + elapsed + "ms — DBA review needed");
        }
    }
}`,
      },
    ],
  },
  mq: {
    title: "IBM MQ Integration — Banking Message Flows",
    tabs: [
      {
        label: "MQTransactionMDB.java",
        lang: "java",
        code: `package com.bank.mq;

import javax.ejb.*;
import javax.jms.*;
import javax.annotation.Resource;
import java.util.logging.Logger;

/**
 * Message-Driven Bean: Processes banking transactions from MQ
 * 
 * PRODUCTION TIPS (10yr):
 *  - Always set maxBatchSize=1 for financial transactions (exactly-once semantics)
 *  - Use MQMD correlation ID to link request/reply
 *  - Poison message handling: maxRedeliveryCount → dead-letter queue
 *  - MQ + XA datasource = 2PC distributed transaction (WAS handles coordination)
 */
@MessageDriven(
    name = "BankTransactionMDB",
    activationConfig = {
        @ActivationConfigProperty(
            propertyName  = "destinationType",
            propertyValue = "javax.jms.Queue"),
        @ActivationConfigProperty(
            propertyName  = "destination",
            propertyValue = "BANK.TXN.REQUEST.Q"),
        @ActivationConfigProperty(
            propertyName  = "acknowledgeMode",
            propertyValue = "Auto-acknowledge"),
        // CRITICAL: maxBatchSize=1 ensures exactly-once for money movement
        @ActivationConfigProperty(
            propertyName  = "maxBatchSize",
            propertyValue = "1"),
        // Concurrent consumers = threads on this MDB
        @ActivationConfigProperty(
            propertyName  = "maxConcurrency",
            propertyValue = "10"),
        // Back-off on poison messages
        @ActivationConfigProperty(
            propertyName  = "maxRedeliveryCount",
            propertyValue = "3"),
        // Dead Letter Queue after max retries
        @ActivationConfigProperty(
            propertyName  = "DLQManager",
            propertyValue = "BANK.QMGR"),
    }
)
@TransactionAttribute(TransactionAttributeType.REQUIRED)
public class BankTransactionMDB implements MessageListener {

    private static final Logger log = Logger.getLogger(BankTransactionMDB.class.getName());

    @Resource(name = "jms/BankingReplyQCF")
    private QueueConnectionFactory replyCF;

    @EJB
    private BankingTransactionBean txnBean;

    @Override
    public void onMessage(Message message) {
        String correlationId = null;
        String replyTo       = null;
        
        try {
            TextMessage textMsg = (TextMessage) message;
            correlationId = message.getJMSCorrelationID();
            Queue replyQueue  = (Queue) message.getJMSReplyTo();
            replyTo = replyQueue != null ? replyQueue.getQueueName() : "NONE";
            
            log.info("MQ received: correlId=" + correlationId + " replyQ=" + replyTo);
            
            // Parse request (JSON payload)
            String payload = textMsg.getText();
            TransactionRequest req = TransactionRequest.fromJson(payload);
            
            // Execute — within XA transaction (MQ + DB atomicity)
            TransactionResponse resp = txnBean.processTransfer(req);
            
            // Send reply back to caller's reply queue
            if (replyQueue != null) {
                sendReply(replyQueue, correlationId, resp);
            }
            
            log.info("MQ transaction PROCESSED: txnRef=" + req.getTxnRef());
            
        } catch (JMSException e) {
            log.severe("MQ onMessage FAILED — correlId=" + correlationId 
                       + " error=" + e.getMessage());
            // XA rollback: both MQ get AND DB changes rolled back by WAS TM
            throw new EJBException("MQ processing failed", e);
        } catch (Exception e) {
            log.severe("Business logic FAILED: " + e.getMessage());
            throw new EJBException("Business processing failed", e);
        }
    }

    private void sendReply(Queue replyQueue, String correlationId,
                            TransactionResponse resp) throws JMSException {
        try (QueueConnection conn = replyCF.createQueueConnection();
             QueueSession session = conn.createQueueSession(false,
                     Session.AUTO_ACKNOWLEDGE);
             QueueSender sender = session.createSender(replyQueue)) {
            
            TextMessage reply = session.createTextMessage(resp.toJson());
            reply.setJMSCorrelationID(correlationId);
            reply.setJMSExpiration(30_000); // 30s TTL on reply
            sender.send(reply);
        }
    }
}`,
      },
      {
        label: "MQ Config (wsadmin)",
        lang: "python",
        code: `# wsadmin Jython: Configure MQ JMS Resources for Banking
# Requires WMQ RA (wmq.jmsra.rar) deployed to WAS

def configureMQResources():
    scope = '/Cell:BankingCell/Cluster:BankingCluster/'
    
    # -------------------------------------------------------
    # 1. MQ Connection Factory
    # -------------------------------------------------------
    cfAttrs = [
        ['name',            'BankingMQ CF'],
        ['jndiName',        'jms/BankingQCF'],
        ['host',            'mqserver.prod.bank.com'],
        ['port',            '1414'],
        ['channel',         'BANK.SVRCONN'],
        ['queueManager',    'BANK.QMGR'],
        ['transportType',   'CLIENT'],
        ['description',     'Banking MQ Connection Factory'],
        # Connection pool for MQ
        ['connectionConcurrency', '50'],
        # SSL for MQ channel (banking mandate)
        ['SSLCipherSuite',  'TLS_RSA_WITH_AES_256_CBC_SHA256'],
        ['SSLPeerName',     'CN=mqserver,OU=Banking,O=BankCorp'],
        ['SSLFipsRequired', 'false'],
    ]
    AdminTask.createWMQConnectionFactory(scope, cfAttrs)
    
    # -------------------------------------------------------
    # 2. Request Queue (inbound transactions)
    # -------------------------------------------------------
    AdminTask.createWMQQueue(scope, [
        ['name',        'BANK.TXN.REQUEST.Q JMS'],
        ['jndiName',    'jms/TxnRequestQ'],
        ['baseQueueName', 'BANK.TXN.REQUEST.Q'],
        ['baseQueueManagerName', 'BANK.QMGR'],
        ['persistence', '2'],        # PERSISTENT — never lose money messages!
        ['priority',    '5'],
        ['expiry',      '0'],        # Never expire request messages
    ])
    
    # -------------------------------------------------------
    # 3. Dead Letter Queue (poison messages)
    # -------------------------------------------------------
    AdminTask.createWMQQueue(scope, [
        ['name',        'BANK.TXN.DLQ JMS'],
        ['jndiName',    'jms/TxnDLQ'],
        ['baseQueueName', 'BANK.TXN.DLQ'],
        ['baseQueueManagerName', 'BANK.QMGR'],
        ['persistence', '2'],        # Must be persistent
    ])
    
    # -------------------------------------------------------
    # 4. Activation Spec for MDB
    # -------------------------------------------------------
    asAttrs = [
        ['name',            'BankTxn ActivationSpec'],
        ['jndiName',        'eis/BankTxnAS'],
        ['destinationType', 'javax.jms.Queue'],
        ['destination',     'jms/TxnRequestQ'],
        ['maxConcurrency',  '10'],        # 10 concurrent MDB threads
        ['maxBatchSize',    '1'],         # CRITICAL: 1 per financial txn
        ['maxRedeliveryCount', '3'],      # 3 attempts before DLQ
        ['redeliveryDelay', '5000'],      # 5s between retries
    ]
    AdminTask.createWMQActivationSpec(scope, asAttrs)
    
    AdminConfig.save()
    print("MQ resources configured for Banking cluster.")

configureMQResources()`,
      },
    ],
  },
  cluster: {
    title: "Cluster Failover Configuration",
    tabs: [
      {
        label: "Cluster Setup (wsadmin)",
        lang: "python",
        code: `# wsadmin Jython: Banking Cluster Configuration
# Production-proven pattern for 2-node HA with session replication

def createBankingCluster():
    
    # -------------------------------------------------------
    # 1. Create Cluster
    # -------------------------------------------------------
    clusterAttrs = [
        ['name',                'BankingCluster'],
        ['description',         'Banking Application HA Cluster'],
        ['preferLocal',         'true'],      # Use local JVM when possible
        ['enableClusterScaling', 'false'],    # Manual scaling in banking
    ]
    cluster = AdminConfig.create('ServerCluster',
                                  AdminConfig.getid('/Cell:BankingCell/'),
                                  clusterAttrs)
    
    # -------------------------------------------------------
    # 2. Add Cluster Members
    # -------------------------------------------------------
    # Node 1
    member1Attrs = [
        ['memberName',    'BankAppServer1'],
        ['nodeName',      'banknode01Node01'],
        ['weight',        '2'],              # Primary gets 2x traffic weight
        ['uniqueId',      '1001'],
    ]
    AdminConfig.create('ClusterMember', cluster, member1Attrs)
    
    # Node 2  
    member2Attrs = [
        ['memberName',    'BankAppServer2'],
        ['nodeName',      'banknode02Node01'],
        ['weight',        '1'],
        ['uniqueId',      '1002'],
    ]
    AdminConfig.create('ClusterMember', cluster, member2Attrs)
    
    # -------------------------------------------------------
    # 3. Session Persistence (Memory-to-Memory Replication)
    # -------------------------------------------------------
    # BANKING CRITICAL: Sessions hold transaction context
    # Use PEER_TO_PEER for 2-node, INMEMORY_REPLICATION for 3+
    tuningAttrs = [
        ['replicationMode',     'SERVER'],
        ['writeContents',       'ONLY_UPDATED_ATTRIBUTES'],  # Bandwidth optimized
        ['writeFrequency',      'TIME_BASED_WRITE'],
        ['writeInterval',       '10'],                       # Write every 10 seconds
        ['scheduleInvalidation', 'false'],
        ['invalidationTimeout', '1800'],                     # 30 min session timeout
    ]
    # Apply to each cluster member's session manager
    for server in ['BankAppServer1', 'BankAppServer2']:
        serverId = AdminConfig.getid(
            '/Cell:BankingCell/Node:banknode01Node01/Server:' + server + '/')
        sessionMgr = AdminConfig.showAttribute(serverId, 'components')
        # (Full session mgr config abbreviated)
    
    AdminConfig.save()
    print("Banking cluster configured with HA session replication.")


def configureJVMsForCluster():
    """
    Tune JVM settings for banking workload.
    Rule: heap = 50% of available RAM, never >8GB initial
    """
    nodes = [
        ('banknode01Node01', 'BankAppServer1'),
        ('banknode02Node01', 'BankAppServer2'),
    ]
    
    for node, server in nodes:
        jvm = AdminConfig.getid(
            '/Cell:BankingCell/Node:{0}/Server:{1}/JavaProcessDef:/'.format(node, server))
        
        jvmAttrs = [
            ['initialHeapSize',    '2048'],      # 2GB initial
            ['maximumHeapSize',    '4096'],      # 4GB max
            ['verboseModeGarbageCollection', 'true'],    # GC logging
            ['verboseModeJNI',     'false'],
            ['genericJvmArguments',
             '-Xgcpolicy:gencon '               # Generational GC (best for txn workloads)
             '-Xmns512m '                       # Nursery start
             '-Xmnx1024m '                      # Nursery max
             '-Xloggc:/logs/was/gc-{0}.log '   # GC log (for IBM GCMV analysis)
             '-XX:+HeapDumpOnOutOfMemoryError ' # Auto heapdump on OOM
             '-XX:HeapDumpPath=/logs/was/dumps/ '
             '-Dcom.ibm.ws.logging.max.files=10 '
             '-Dsun.net.client.defaultConnectTimeout=30000 '
             '-Dsun.net.client.defaultReadTimeout=120000 '
             '-Dfile.encoding=UTF-8'.format(server)
            ],
        ]
        AdminConfig.modify(jvm, jvmAttrs)
    
    AdminConfig.save()
    print("JVM tuning applied to all cluster members.")

createBankingCluster()
configureJVMsForCluster()`,
      },
      {
        label: "Failover Test Script",
        lang: "bash",
        code: `#!/bin/bash
# Banking Cluster Failover Test — Run during maintenance window
# Validates: session persistence, request routing, no data loss

PRIMARY="banknode01.prod.bank.com"
SECONDARY="banknode02.prod.bank.com"
APP_URL="https://bankportal.prod.bank.com/BankingApp"
WAS_ADMIN="https://banknode01.prod.bank.com:9043/ibm/console"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

log "=== Banking Cluster Failover Test ==="

# 1. Confirm both nodes healthy
log "Step 1: Health check both nodes..."
for node in $PRIMARY $SECONDARY; do
    STATUS=$(curl -sk "https://${node}:9443/BankingApp/health" -o /dev/null -w "%{http_code}")
    if [ "$STATUS" != "200" ]; then
        log "ERROR: Node $node is DOWN (HTTP $STATUS) — aborting!"
        exit 1
    fi
    log "  ✓ $node is healthy (HTTP $STATUS)"
done

# 2. Create a test session on primary
log "Step 2: Establishing session on primary node..."
SESSION=$(curl -sk -c /tmp/banking_cookie.txt \
    "$APP_URL/api/login" \
    -H "Content-Type: application/json" \
    -d '{"user":"test_failover","pass":"test123"}' | jq -r '.sessionId')
log "  Session established: $SESSION"

# 3. Make a transaction (write to DB + session)
log "Step 3: Initiating test transfer on primary..."
TXN_REF=$(curl -sk -b /tmp/banking_cookie.txt \
    "$APP_URL/api/transfer" \
    -H "Content-Type: application/json" \
    -d '{"from":"ACC001","to":"ACC002","amount":1.00}' | jq -r '.txnRef')
log "  Transaction submitted: $TXN_REF"

# 4. Abruptly stop primary (simulates crash)
log "Step 4: STOPPING primary node (crash simulation)..."
wsadmin.sh -host $PRIMARY -port 8879 -user wasadmin -password $WAS_PASS \
    -lang jython -c "AdminControl.stopServer('BankAppServer1', 'banknode01Node01', 'immediate')"
sleep 10

# 5. Verify IHS rerouted to secondary
log "Step 5: Verifying routing to secondary..."
ACTIVE_NODE=$(curl -sk "$APP_URL/api/node" | jq -r '.activeNode')
log "  Active node after failover: $ACTIVE_NODE"

if [[ "$ACTIVE_NODE" == *"banknode02"* ]]; then
    log "  ✓ IHS correctly routed to secondary"
else
    log "  ✗ ROUTING FAILURE — check plugin-cfg.xml"
fi

# 6. Verify session survived (session replication worked)
log "Step 6: Verifying session persisted on secondary..."
SESSION_CHECK=$(curl -sk -b /tmp/banking_cookie.txt \
    "$APP_URL/api/session/validate" | jq -r '.valid')
if [ "$SESSION_CHECK" == "true" ]; then
    log "  ✓ Session SURVIVED failover (memory replication working)"
else
    log "  ✗ SESSION LOST — check replication config"
fi

# 7. Verify transaction was committed (no data loss)
log "Step 7: Verifying transaction committed in PostgreSQL..."
TXN_STATUS=$(psql -h pgcluster.prod.bank.com -U banking_ro -d banking_core \
    -t -c "SELECT status FROM banking.transactions WHERE txn_ref='$TXN_REF'")
TXN_STATUS=$(echo $TXN_STATUS | tr -d ' ')
if [ "$TXN_STATUS" == "COMPLETED" ]; then
    log "  ✓ Transaction COMMITTED — no data loss during failover"
else
    log "  ✗ Transaction status: $TXN_STATUS — INVESTIGATE!"
fi

log "=== Failover test complete ==="`,
      },
    ],
  },
  jvm: {
    title: "JVM Troubleshooting — Banking Production",
    tabs: [
      {
        label: "Diagnostic Commands",
        lang: "bash",
        code: `#!/bin/bash
# WAS JVM Troubleshooting Runbook — Banking Production
# 10-Year Field Guide: Most common incidents and their fixes

WAS_HOME="/opt/IBM/WebSphere/AppServer"
LOG_DIR="/opt/IBM/WebSphere/AppServer/profiles/BankingProfile/logs/BankAppServer1"

# =====================================================================
# INCIDENT 1: OutOfMemoryError (most common banking incident)
# Symptoms: JVMDUMP006 messages, app unresponsive, container restart
# =====================================================================
diagnose_oom() {
    echo "=== OOM Diagnosis ==="
    
    # Check for heap dumps (auto-generated with -XX:+HeapDumpOnOutOfMemoryError)
    ls -lh /logs/was/dumps/*.phd 2>/dev/null || echo "No heap dumps found"
    
    # Check GC log for memory pressure
    tail -100 $LOG_DIR/native_stderr.log | grep -E "GC|OutOfMemory|heap"
    
    # Analyze GC log with IBM GCMV (offline tool)
    # Download: https://www.ibm.com/support/pages/garbage-collection-and-memory-visualizer
    echo "Analyze GC log: $LOG_DIR/gc-BankAppServer1.log"
    echo "Tool: IBM Garbage Collection and Memory Visualizer (GCMV)"
    
    # Quick GC stats
    grep "GC cycle" $LOG_DIR/native_stderr.log | \
        awk '{print $NF}' | sort -n | tail -5
    echo "^ Last 5 GC pause times (ms) — if >2000ms, tune -Xmns/-Xmnx"
}

# =====================================================================
# INCIDENT 2: Thread Hang / Hung Transactions
# Symptoms: Response times >30s, active thread count maxed out
# =====================================================================
diagnose_thread_hang() {
    echo "=== Thread Hang Diagnosis ==="
    
    # 1. Get WAS server PID
    PID=$(cat $LOG_DIR/server.pid 2>/dev/null)
    if [ -z "$PID" ]; then
        PID=$(ps -ef | grep BankAppServer1 | grep -v grep | awk '{print $2}')
    fi
    echo "WAS PID: $PID"
    
    # 2. Generate thread dump (IBM JVM: javacore via kill -3)
    echo "Generating thread dump..."
    kill -3 $PID
    sleep 2
    # Output: $LOG_DIR/javacore.YYYYMMDD.HHMMSS.pid.seq.txt
    
    # 3. Get latest javacore
    JAVACORE=$(ls -t $LOG_DIR/javacore.*.txt 2>/dev/null | head -1)
    echo "Javacore: $JAVACORE"
    
    # 4. Analyze with IBM Thread and Monitor Dump Analyzer (TMDA)
    # java -jar jca457.jar $JAVACORE
    
    # 5. Quick checks from javacore
    if [ -f "$JAVACORE" ]; then
        echo "=== Blocked Threads ==="
        grep -A3 "Waiting to be notified\|waiting for\|BLOCKED" $JAVACORE | head -50
        
        echo "=== Database Wait (most common banking hang) ==="
        grep -B5 "OracleCallableStatement\|PgPreparedStatement\|socketRead0" $JAVACORE | head -30
        
        echo "=== Thread Pool Status ==="
        grep "Active Threads\|Pool size" $JAVACORE
        
        echo "=== Lock Contention ==="
        grep -A5 "waiting to lock" $JAVACORE | head -30
    fi
    
    echo ""
    echo "COMMON CAUSES (banking):"
    echo "  1. DB query running long (>30s) — check pg_stat_activity"
    echo "  2. MQ connection blocked — check BANK.QMGR channel status"
    echo "  3. Web service timeout to core banking — check SOAP client timeout"
    echo "  4. Thread pool exhausted — increase ORB thread pool or WebContainer"
}

# =====================================================================
# INCIDENT 3: High CPU (GC thrash)
# =====================================================================
diagnose_high_cpu() {
    echo "=== High CPU Diagnosis ==="
    
    PID=$(ps -ef | grep BankAppServer1 | grep -v grep | awk '{print $2}')
    
    # Find which threads are consuming CPU
    echo "Top CPU threads:"
    top -b -n1 -H -p $PID | head -30
    
    # Correlate thread ID (decimal → hex) with javacore
    echo "Convert thread TID to hex for javacore lookup:"
    top -b -n1 -H -p $PID | awk 'NR>7 && $9>10 {printf "TID: %d = 0x%X\\n", $1, $1}' | head -10
    
    # Check if GC thread is high CPU (GC thrash)
    echo "GC thread activity (GC thrash = OOM incoming):"
    top -b -n1 -H -p $PID | grep GC | head -5
}

# =====================================================================
# INCIDENT 4: PermGen/Metaspace leak (class loader leak)
# Symptoms: Slow memory growth, FFDC ClassLoader errors after redeploy
# =====================================================================
diagnose_classloader() {
    echo "=== ClassLoader Leak Check ==="
    echo "IBM JVM: Check native memory with -Xdump:heap:events=systhrow"
    
    JAVACORE=$(ls -t $LOG_DIR/javacore.*.txt | head -1)
    if [ -f "$JAVACORE" ]; then
        echo "=== Class Loaders ==="
        grep "classloader\|ClassLoader" $JAVACORE | wc -l
        echo "^ If >500 classloaders, you have a leak (typically after hot redeploy)"
        
        echo "COMMON BANKING CAUSES:"
        echo "  - Thread-local variables holding class refs (log4j, JDBC drivers)"
        echo "  - Static caches not cleared on undeploy"
        echo "  - Custom SecurityManager not released"
    fi
}

# =====================================================================
# UTILITY: Monitor WAS health in real-time
# =====================================================================
monitor_was_health() {
    echo "=== Real-time WAS Health Monitor ==="
    while true; do
        clear
        echo "=== $(date) ==="
        
        # Active HTTP threads
        ACTIVE_THREADS=$(wsadmin.sh -lang jython -c \
            "print AdminControl.getAttribute(AdminControl.queryNames('*:*,type=ThreadPool,name=WebContainer'), 'activeThreads')" \
            2>/dev/null | tail -1)
        echo "WebContainer Active Threads: $ACTIVE_THREADS / 100"
        
        # Heap usage
        HEAP_USED=$(wsadmin.sh -lang jython -c \
            "print AdminControl.getAttribute(AdminControl.queryNames('*:*,type=JVM'), 'heapSize')" \
            2>/dev/null | tail -1)
        echo "Heap Used: $HEAP_USED bytes"
        
        # DB pool usage
        POOL_SIZE=$(wsadmin.sh -lang jython -c \
            "mbean = AdminControl.queryNames('*:*,type=ConnectionPool,name=BankingDS*'); print AdminControl.getAttribute(mbean, 'poolSize')" \
            2>/dev/null | tail -1)
        echo "DB Pool Size: $POOL_SIZE"
        
        sleep 30
    done
}

# Main dispatch
case "$1" in
    oom)      diagnose_oom ;;
    hang)     diagnose_thread_hang ;;
    cpu)      diagnose_high_cpu ;;
    classloader) diagnose_classloader ;;
    monitor)  monitor_was_health ;;
    *)
        echo "Usage: $0 {oom|hang|cpu|classloader|monitor}"
        echo "Banking JVM Troubleshooting Toolkit"
        ;;
esac`,
      },
    ],
  },
  ssl: {
    title: "SSL / Security Configuration",
    tabs: [
      {
        label: "SSL Setup (wsadmin)",
        lang: "python",
        code: `# wsadmin Jython: Banking SSL/TLS Configuration
# PCI-DSS Compliance: TLS 1.2+ only, strong cipher suites

def configureSSL():
    """Configure SSL repertoire for banking WAS environment."""
    
    # -------------------------------------------------------
    # 1. Create Key Store (PKCS12 — industry standard)
    # -------------------------------------------------------
    ksAttrs = [
        ['name',        'BankingKeyStore'],
        ['location',    '/opt/bank/certs/banking-keystore.p12'],
        ['password',    '{xor}Kz4sLCgwLTs='],  # Encoded, use AdminTask.encodePassword()
        ['type',        'PKCS12'],
        ['readOnly',    'false'],
        ['description', 'Banking SSL Keystore — Prod'],
    ]
    AdminTask.createKeyStore(ksAttrs)
    
    # Trust Store (CA certs for mutual TLS)
    tsAttrs = [
        ['name',        'BankingTrustStore'],
        ['location',    '/opt/bank/certs/banking-truststore.p12'],
        ['password',    '{xor}Kz4sLCgwLTs='],
        ['type',        'PKCS12'],
    ]
    AdminTask.createKeyStore(tsAttrs)
    
    # -------------------------------------------------------
    # 2. SSL Repertoire — TLS 1.2+ only (PCI-DSS requirement)
    # -------------------------------------------------------
    sslAttrs = [
        ['alias',               'BankingSSLConfig'],
        ['type',                'JSSE'],
        ['keyStoreName',        'BankingKeyStore'],
        ['trustStoreName',      'BankingTrustStore'],
        # TLS 1.3 preferred, 1.2 minimum
        ['protocol',            'TLSv1.3'],
        # Banking-approved cipher suites (FIPS 140-2 compliant)
        ['enabledCiphers',
         'TLS_AES_256_GCM_SHA384 '
         'TLS_AES_128_GCM_SHA256 '
         'TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384 '
         'TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256 '
         'TLS_RSA_WITH_AES_256_GCM_SHA384'],
        ['clientAuthentication',    'false'],
        ['clientAuthenticationSupported', 'true'],  # Optional mTLS
        ['securityLevel',       'HIGH'],
    ]
    AdminTask.createSSLConfig(sslAttrs)
    
    # -------------------------------------------------------
    # 3. Apply SSL to HTTPS Transport
    # -------------------------------------------------------
    for server in ['BankAppServer1', 'BankAppServer2']:
        # Get HTTPS chain
        chains = AdminTask.listSSLConfigs('[-scopeName Cell=BankingCell]')
        
        # Update transport channel
        tcpChannel = AdminConfig.getid(
            '/Cell:BankingCell/Node:banknode01Node01/Server:{}/TransportChannelService:/'.format(server))
        
        AdminTask.setSSLConfig([
            '-scopeName', 'Cell=BankingCell,Node=banknode01Node01,Server=' + server,
            '-certAlias', 'banking-ssl-cert',
            '-sslConfig', 'BankingSSLConfig',
        ])
    
    AdminConfig.save()
    print("SSL configured: TLS 1.3, FIPS cipher suites, banking keystores.")


def configureJAAS():
    """JAAS Authentication for banking application security."""
    
    # J2C Authentication Data (DB credentials — never hardcode in app)
    j2cAttrs = [
        ['alias',       'banking_db_auth'],
        ['userId',      'banking_app'],
        ['password',    '{xor}Kz4sLCgwLTs='],
        ['description', 'PostgreSQL Banking DB User'],
    ]
    AdminConfig.create('JAASAuthData',
                        AdminConfig.getid('/Cell:BankingCell/Security:/'),
                        j2cAttrs)
    
    # MQ auth alias
    mqJ2cAttrs = [
        ['alias',       'banking_mq_auth'],
        ['userId',      'banking_mq_app'],
        ['password',    '{xor}mq_password_encoded'],
        ['description', 'MQ Banking Application User'],
    ]
    AdminConfig.create('JAASAuthData',
                        AdminConfig.getid('/Cell:BankingCell/Security:/'),
                        mqJ2cAttrs)
    
    AdminConfig.save()
    print("JAAS authentication aliases configured.")


def verifySSLHandshake():
    """Quick verification of SSL config from wsadmin."""
    print("Testing SSL connectivity to banking endpoints...")
    
    # Test WAS → PostgreSQL SSL
    try:
        result = AdminTask.testConnection(['-jndiName', 'jdbc/BankingDS'])
        print("DB SSL connection: OK")
    except:
        print("DB SSL connection: FAILED — check pg sslmode=verify-full certs")
    
    # SSL report
    print("\\nSSL Configuration Report:")
    print(AdminTask.retrieveSignerFromPort([
        '-host', 'bankportal.prod.bank.com',
        '-port', '443',
        '-certificateAlias', 'banking-tls-check',
    ]))

configureSSL()
configureJAAS()`,
      },
    ],
  },
  production: {
    title: "Production Support Scenarios",
    tabs: [
      {
        label: "Runbook",
        lang: "bash",
        code: `#!/bin/bash
# ================================================================
# BANKING PRODUCTION SUPPORT RUNBOOK
# For WAS 9.x + PostgreSQL 15 + MQ 9.x
# 10-Year battle-tested incident response playbook
# ================================================================

# ---------------------------------------------------------------
# P1 INCIDENT: App completely unresponsive
# ---------------------------------------------------------------
p1_app_down() {
    echo "=== P1: App Down Investigation (ETA: 15 min resolution) ==="
    
    # Step 1: Check WAS process (fastest check)
    echo "[1/8] WAS process check..."
    ps -ef | grep BankAppServer | grep -v grep
    if [ $? -ne 0 ]; then
        echo "CRITICAL: WAS process NOT running — starting server..."
        $WAS_HOME/bin/startServer.sh BankAppServer1
        return
    fi
    
    # Step 2: Check IHS → WAS plugin connectivity
    echo "[2/8] IHS plugin check..."
    curl -sk https://banknode01.prod.bank.com:9443/BankingApp/health -o /dev/null -w "HTTP: %{http_code}\n"
    
    # Step 3: Check WAS admin console reachable
    echo "[3/8] WAS Admin Console..."
    curl -sk https://banknode01.prod.bank.com:9043/ibm/console/ -o /dev/null -w "Admin: %{http_code}\n"
    
    # Step 4: Check PostgreSQL connectivity
    echo "[4/8] PostgreSQL check..."
    psql -h pgcluster.prod.bank.com -U banking_health -d banking_core \
         -c "SELECT 1" -t 2>&1 | head -1
    
    # Step 5: Check MQ manager
    echo "[5/8] MQ Queue Manager check..."
    echo "PING QMGR 1" | runmqsc BANK.QMGR 2>&1 | grep -i "ping\|not running"
    
    # Step 6: Tail SystemOut for errors
    echo "[6/8] Recent SystemOut errors..."
    tail -50 $LOG_DIR/SystemOut.log | grep -E "ERROR|EXCEPTION|OutOfMemory|FFDC" | tail -20
    
    # Step 7: Thread dump if WAS running but unresponsive
    echo "[7/8] Generating thread dump (if hung)..."
    PID=$(ps -ef | grep BankAppServer1 | grep -v grep | awk '{print $2}')
    [ -n "$PID" ] && kill -3 $PID
    
    # Step 8: FFDC check
    echo "[8/8] FFDC (First Failure Data Capture) summary..."
    ls -lt $WAS_HOME/profiles/BankingProfile/logs/ffdc/ | head -10
    tail -30 $(ls -t $WAS_HOME/profiles/BankingProfile/logs/ffdc/*.txt | head -1)
    
    echo "=== Escalation: DBA (slow queries), Infra (network), MQ Admin ==="
}

# ---------------------------------------------------------------
# P2 INCIDENT: Slow transactions / High response time
# ---------------------------------------------------------------
p2_slow_transactions() {
    echo "=== P2: Slow Transactions Investigation ==="
    
    # 1. Check active DB queries (most common cause in banking)
    echo "[DB] Long-running PostgreSQL queries:"
    psql -h pgcluster.prod.bank.com -U banking_dba -d banking_core -c "
        SELECT pid, now() - query_start AS duration, state, left(query, 100) AS query
        FROM pg_stat_activity
        WHERE state != 'idle'
          AND query_start < NOW() - INTERVAL '5 seconds'
          AND query NOT LIKE '%pg_stat%'
        ORDER BY duration DESC
        LIMIT 10;"
    
    # 2. Check DB locks (blocking transactions)
    echo "[DB] Lock contention:"
    psql -h pgcluster.prod.bank.com -U banking_dba -d banking_core -c "
        SELECT blocked_locks.pid AS blocked_pid,
               blocked_activity.query AS blocked_query,
               blocking_locks.pid AS blocking_pid,
               blocking_activity.query AS blocking_query
        FROM pg_catalog.pg_locks blocked_locks
        JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
        JOIN pg_catalog.pg_locks blocking_locks
            ON blocking_locks.locktype = blocked_locks.locktype
           AND blocking_locks.relation = blocked_locks.relation
           AND NOT blocked_locks.granted
        JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
        WHERE NOT blocked_locks.granted;"
    
    # 3. Check WAS thread pool saturation
    echo "[WAS] Thread pool status:"
    wsadmin.sh -lang jython -c "
import jarray
pools = AdminControl.queryNames('*:type=ThreadPool,*').split('\n')
for pool in pools:
    try:
        active = AdminControl.getAttribute(pool, 'activeThreads')
        poolSize = AdminControl.getAttribute(pool, 'poolSize')
        name = AdminControl.getAttribute(pool, 'name')
        print('{}: {}/{}'.format(name, active, poolSize))
    except: pass
" 2>/dev/null | grep -v "^WASX"
    
    # 4. Check MQ queue depth (backlog)
    echo "[MQ] Queue depths:"
    echo "DISPLAY QSTATUS(BANK.TXN.REQUEST.Q) CURDEPTH IPPROCS OPPROCS" | \
        runmqsc BANK.QMGR 2>/dev/null | grep -E "CURDEPTH|IPPROCS|OPPROCS"
    
    # 5. Connection pool exhaustion
    echo "[JDBC] Connection pool stats:"
    wsadmin.sh -lang jython -c "
mbean = AdminControl.queryNames('*:type=ConnectionPool,name=BankingDS*')
print('Pool Size:', AdminControl.getAttribute(mbean, 'poolSize'))
print('Free:', AdminControl.getAttribute(mbean, 'freeConnectionCount'))
print('Wait Queue:', AdminControl.getAttribute(mbean, 'waitingThreadCount'))
" 2>/dev/null | tail -4
}

# ---------------------------------------------------------------
# UTILITY: Graceful rolling restart (zero downtime)
# ---------------------------------------------------------------
rolling_restart() {
    echo "=== Rolling Restart (Zero Downtime) ==="
    
    for NODE in banknode02 banknode01; do  # Restart secondary first
        SERVER="BankAppServer$([ $NODE = banknode01 ] && echo 1 || echo 2)"
        echo "Restarting $SERVER on $NODE..."
        
        # Drain connections from this node (IHS weight=0)
        wsadmin.sh -lang jython -c \
            "AdminControl.invoke(AdminControl.queryNames('*:type=ClusterMember,name=${SERVER}*'), 'setWeight', '0')"
        sleep 60  # Wait for in-flight requests to complete
        
        # Restart
        $WAS_HOME/bin/stopServer.sh $SERVER -username wasadmin -password $WAS_PASS
        sleep 15
        $WAS_HOME/bin/startServer.sh $SERVER
        
        # Wait for app to be ready
        for i in {1..30}; do
            STATUS=$(curl -sk "https://${NODE}.prod.bank.com:9443/BankingApp/health" \
                         -o /dev/null -w "%{http_code}")
            [ "$STATUS" == "200" ] && break
            sleep 10
        done
        
        # Restore weight
        wsadmin.sh -lang jython -c \
            "AdminControl.invoke(AdminControl.queryNames('*:type=ClusterMember,name=${SERVER}*'), 'setWeight', '$([ $NODE = banknode01 ] && echo 2 || echo 1)')"
        
        echo "  ✓ $SERVER restarted and healthy"
    done
    
    echo "=== Rolling restart complete — no downtime ==="
}

case "$1" in
    p1)      p1_app_down ;;
    p2)      p2_slow_transactions ;;
    restart) rolling_restart ;;
    *)       echo "Usage: $0 {p1|p2|restart}" ;;
esac`,
      },
    ],
  },
  wsadmin: {
    title: "wsadmin Scripting — Advanced",
    tabs: [
      {
        label: "Admin Toolkit",
        lang: "python",
        code: `#!/usr/bin/env jython
# ================================================================
# wsadmin Admin Toolkit — Banking WAS 9.x
# Usage: wsadmin.sh -lang jython -f admin_toolkit.py -- <command>
# ================================================================
import sys, re
from datetime import datetime

WAS_ADMIN = "wasadmin"
CELL      = "BankingCell"
CLUSTER   = "BankingCluster"

# ---------------------------------------------------------------
# APPLICATION DEPLOYMENT (Blue-Green safe)
# ---------------------------------------------------------------
def deployApplication(earPath, appName, contextRoot):
    """Deploy or update EAR with banking-specific options."""
    
    deployOptions = [
        '-appname',         appName,
        '-contextroot',     contextRoot,
        '-distributeApp',   '',
        '-usedefaultbindings', '',
        '-MapModulesToServers',
            [['.*', '.*', 'WebSphere:cluster={}'.format(CLUSTER)]],
        '-MapJaspiProvider', '',
        '-BindJndiForEJBNonMessageBinding', [
            ['BankingEJB', 'ejb/BankingTxnBean', 'ejb/BankingTxnBean', '*', '*', ''],
        ],
        '-DataSourceFor20EJBModules', [
            ['BankingEJB', 'jdbc/BankingDS', 'banking_db_auth'],
        ],
    ]
    
    # Check if app exists (update vs install)
    existingApp = AdminApp.list().find(appName)
    if existingApp != -1:
        print("Updating existing application: " + appName)
        AdminApp.update(appName, 'app', deployOptions + ['-operation', 'update'])
    else:
        print("Installing new application: " + appName)
        AdminApp.install(earPath, deployOptions)
    
    AdminConfig.save()
    
    # Start the application
    appManager = AdminControl.queryNames(
        'cell={},type=ApplicationManager,*'.format(CELL))
    AdminControl.invoke(appManager, 'startApplication', appName)
    print("Application {} deployed and started.".format(appName))


# ---------------------------------------------------------------
# ENVIRONMENT VARIABLES (Banking config externalisation)
# ---------------------------------------------------------------
def setEnvironmentVariables():
    """Set WAS environment variables (avoid hardcoding in app)."""
    
    envVars = {
        'BANKING_LIB':      '/opt/bank/lib',
        'BANKING_CONFIG':   '/opt/bank/config',
        'BANKING_LOG_LEVEL':'INFO',
        'MQ_QUEUE_MANAGER': 'BANK.QMGR',
        'MQ_HOST':          'mqserver.prod.bank.com',
        'PG_HOST':          'pgcluster.prod.bank.com',
        'BANKING_ENV':      'PRODUCTION',
        # JVM property to pick up env in app
        'com.bank.env':     'production',
    }
    
    varSubstitutions = AdminConfig.getid(
        '/Cell:{}/VariableSubstitution:/'.format(CELL))
    
    for name, value in envVars.items():
        # Check if exists
        existing = AdminConfig.getid(
            '/Cell:{}/VariableSubstitution:{}=/'.format(CELL, name))
        
        if existing:
            AdminConfig.modify(existing, [['value', value]])
            print("Updated: {} = {}".format(name, value))
        else:
            AdminConfig.create('VariableSubstitutionEntry',
                               varSubstitutions,
                               [['symbolicName', name], ['value', value]])
            print("Created: {} = {}".format(name, value))
    
    AdminConfig.save()


# ---------------------------------------------------------------
# HEALTH CHECK: Comprehensive cluster status
# ---------------------------------------------------------------
def clusterHealthCheck():
    """Banking cluster health report."""
    
    print("=" * 60)
    print("BANKING CLUSTER HEALTH REPORT — " + str(datetime.now()))
    print("=" * 60)
    
    # Server states
    servers = AdminControl.queryNames(
        'cell={},type=Server,*'.format(CELL)).split('\n')
    
    print("\n[SERVER STATUS]")
    for server in servers:
        if not server.strip(): continue
        try:
            name  = AdminControl.getAttribute(server, 'name')
            state = AdminControl.getAttribute(server, 'state')
            print("  {} : {}".format(name.ljust(30), state))
        except: pass
    
    # Connection pool stats
    print("\n[CONNECTION POOL: BankingDS]")
    pools = AdminControl.queryNames(
        'cell={},type=ConnectionPool,name=BankingDS*'.format(CELL)).split('\n')
    for pool in pools:
        if not pool.strip(): continue
        try:
            total    = AdminControl.getAttribute(pool, 'poolSize')
            free     = AdminControl.getAttribute(pool, 'freeConnectionCount')
            waiting  = AdminControl.getAttribute(pool, 'waitingThreadCount')
            node     = re.search(r'node=([^,]+)', pool).group(1)
            print("  {} — Total:{} Free:{} Waiting:{}".format(
                node.ljust(25), total, free, waiting))
        except: pass
    
    # Thread pools
    print("\n[THREAD POOLS: WebContainer]")
    tpools = AdminControl.queryNames(
        'cell={},type=ThreadPool,name=WebContainer*'.format(CELL)).split('\n')
    for tp in tpools:
        if not tp.strip(): continue
        try:
            active   = AdminControl.getAttribute(tp, 'activeThreads')
            poolSize = AdminControl.getAttribute(tp, 'poolSize')
            node     = re.search(r'node=([^,]+)', tp).group(1)
            pct = int(active) * 100 // max(int(poolSize), 1)
            bar = '#' * (pct // 5) + '.' * (20 - pct // 5)
            print("  {} [{}] {}/{}".format(
                node.ljust(25), bar, active, poolSize))
        except: pass
    
    # Application state
    print("\n[APPLICATIONS]")
    apps = AdminApp.list().split('\n')
    for app in apps:
        if not app.strip(): continue
        print("  " + app)
    
    print("\n" + "=" * 60)


# ---------------------------------------------------------------
# JVM HEAP REPORT
# ---------------------------------------------------------------
def jvmHeapReport():
    """Quick heap status across all cluster members."""
    
    print("\n[JVM HEAP USAGE]")
    jvms = AdminControl.queryNames(
        'cell={},type=JVM,*'.format(CELL)).split('\n')
    
    for jvm in jvms:
        if not jvm.strip(): continue
        try:
            used  = int(AdminControl.getAttribute(jvm, 'heapSize'))
            maxH  = int(AdminControl.getAttribute(jvm, 'maxHeapSize'))
            node  = re.search(r'node=([^,]+)', jvm).group(1)
            pct   = used * 100 // max(maxH, 1)
            used_mb = used // 1024 // 1024
            max_mb  = maxH // 1024 // 1024
            flag = "⚠️ " if pct > 80 else "✓  "
            print("  {}{} — {}MB / {}MB ({}%)".format(
                flag, node.ljust(25), used_mb, max_mb, pct))
        except: pass


# Dispatch
cmd = sys.argv[1] if len(sys.argv) > 1 else "health"
if cmd == "health":   clusterHealthCheck(); jvmHeapReport()
elif cmd == "deploy": deployApplication(sys.argv[2], sys.argv[3], sys.argv[4])
elif cmd == "env":    setEnvironmentVariables()
else: print("Commands: health | deploy <ear> <name> <ctx> | env")`,
      },
    ],
  },
  txflow: {
    title: "Banking Transaction Flow — End to End",
    tabs: [
      {
        label: "TransactionBean.java",
        lang: "java",
        code: `package com.bank.ejb;

import com.bank.dao.BankingDAO;
import com.bank.mq.MQPublisher;
import com.bank.model.*;
import com.bank.security.FraudDetectionService;

import javax.annotation.Resource;
import javax.ejb.*;
import javax.transaction.UserTransaction;
import java.math.BigDecimal;
import java.util.UUID;
import java.util.logging.Logger;

/**
 * Banking Transaction Session Bean
 * 
 * ARCHITECTURE: Stateless Session Bean (SLSB) in WAS cluster
 * TX MANAGEMENT: Container-managed (CMT) — WAS + PostgreSQL XA
 * 
 * TRANSACTION FLOW:
 *  Browser → IHS → WAS Plugin → BankingServlet → THIS BEAN
 *                                                    ↓
 *                                           FraudDetection (sync)
 *                                                    ↓
 *                                           PostgreSQL (XA write)
 *                                                    ↓
 *                                           MQ (XA enqueue)
 *                                                    ↓
 *                                           Response → Client
 */
@Stateless(name = "BankingTransactionBean")
@Remote(BankingTransactionRemote.class)
@Local(BankingTransactionLocal.class)
@TransactionManagement(TransactionManagementType.CONTAINER)
public class BankingTransactionBean implements BankingTransactionRemote, BankingTransactionLocal {

    private static final Logger log = Logger.getLogger(BankingTransactionBean.class.getName());
    private static final BigDecimal MAX_TRANSFER_LIMIT = new BigDecimal("100000.00");
    private static final BigDecimal FRAUD_REVIEW_THRESHOLD = new BigDecimal("10000.00");

    @EJB
    private BankingDAO bankingDAO;

    @EJB
    private FraudDetectionService fraudService;

    @Resource
    private MQPublisher mqPublisher;

    // ---------------------------------------------------------------
    // CORE TRANSFER: Full banking transaction with compliance
    // ---------------------------------------------------------------
    @TransactionAttribute(TransactionAttributeType.REQUIRED)
    @Override
    public TransactionResponse processTransfer(TransactionRequest request) {
        
        String txnRef = generateTxnRef();
        log.info("Processing transfer txnRef=" + txnRef + 
                 " from=" + request.getFromAccount() +
                 " to=" + request.getToAccount() +
                 " amount=" + request.getAmount());

        try {
            // ---- STEP 1: Business Validations ----
            validateTransferRequest(request);
            
            // ---- STEP 2: Fraud Detection (synchronous, pre-commit) ----
            FraudScore score = fraudService.assess(request);
            if (score.isHighRisk()) {
                log.warning("FRAUD ALERT: txnRef=" + txnRef + 
                            " score=" + score.getScore() +
                            " — transaction BLOCKED");
                auditEvent(txnRef, "FRAUD_BLOCKED", request);
                return TransactionResponse.rejected(txnRef, "Transaction blocked by risk controls");
            }
            
            // ---- STEP 3: Execute DB Transfer (within CMT transaction) ----
            bankingDAO.transferFunds(
                request.getFromAccount(),
                request.getToAccount(),
                request.getAmount(),
                txnRef
            );
            
            // ---- STEP 4: Enqueue to MQ (same XA transaction as DB) ----
            // Both DB write AND MQ enqueue are atomic via 2PC
            TransactionEvent event = new TransactionEvent(
                txnRef,
                request.getFromAccount(),
                request.getToAccount(),
                request.getAmount(),
                TransactionEvent.Type.TRANSFER_COMPLETED
            );
            mqPublisher.publish("BANK.TXN.NOTIFICATION.Q", event.toJson());
            
            // ---- STEP 5: Regulatory Reporting (>10k requires CTR) ----
            if (request.getAmount().compareTo(FRAUD_REVIEW_THRESHOLD) >= 0) {
                // Async — separate transaction so it doesn't block primary
                notifyComplianceAsync(txnRef, request);
            }
            
            log.info("Transfer COMPLETED: txnRef=" + txnRef);
            return TransactionResponse.success(txnRef);
            
        } catch (InsufficientFundsException e) {
            // CMT rolls back automatically on unchecked exception
            log.warning("Insufficient funds: " + request.getFromAccount());
            return TransactionResponse.rejected(txnRef, "Insufficient funds");
            
        } catch (Exception e) {
            log.severe("Transfer FAILED: txnRef=" + txnRef + " — " + e.getMessage());
            // CMT rolls back both PostgreSQL and MQ (XA 2PC)
            throw new EJBException("Transfer processing failed", e);
        }
    }

    // ---------------------------------------------------------------
    // ACCOUNT QUERY: Read-only, no transaction needed
    // ---------------------------------------------------------------
    @TransactionAttribute(TransactionAttributeType.SUPPORTS)
    @Override
    public AccountSummary getAccountSummary(String accountId, String requestingUser) {
        // Authorisation check (JACC / programmatic)
        if (!isAuthorised(requestingUser, accountId)) {
            throw new SecurityException("Unauthorised account access: " + accountId);
        }
        
        try {
            BigDecimal balance = bankingDAO.getAccountBalance(accountId);
            return new AccountSummary(accountId, balance,
                    bankingDAO.getStatement(accountId, 3));
        } catch (Exception e) {
            log.severe("Balance query failed: " + accountId + " — " + e.getMessage());
            throw new EJBException("Balance query failed", e);
        }
    }

    // ---------------------------------------------------------------
    // PRIVATE HELPERS
    // ---------------------------------------------------------------
    private void validateTransferRequest(TransactionRequest req) {
        if (req.getAmount().compareTo(BigDecimal.ZERO) <= 0)
            throw new IllegalArgumentException("Amount must be positive");
        if (req.getAmount().compareTo(MAX_TRANSFER_LIMIT) > 0)
            throw new IllegalArgumentException("Amount exceeds maximum transfer limit");
        if (req.getFromAccount().equals(req.getToAccount()))
            throw new IllegalArgumentException("Source and destination accounts must differ");
    }
    
    private String generateTxnRef() {
        return "TXN-" + System.currentTimeMillis() + "-" + 
               UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }
    
    @TransactionAttribute(TransactionAttributeType.REQUIRES_NEW)
    private void notifyComplianceAsync(String txnRef, TransactionRequest req) {
        // Runs in its OWN transaction — isolation from primary
        mqPublisher.publish("BANK.COMPLIANCE.CTR.Q", 
            new CTRReport(txnRef, req).toJson());
    }
    
    private boolean isAuthorised(String user, String accountId) {
        // Integrate with bank's LDAP/RACF authorisation
        return bankingDAO.checkAccountOwnership(user, accountId);
    }
    
    private void auditEvent(String txnRef, String event, TransactionRequest req) {
        bankingDAO.insertAuditLog(txnRef, event, req.getFromAccount(), 
                                  req.getToAccount(), req.getAmount());
    }
}`,
      },
    ],
  },
  postgresql: {
    title: "PostgreSQL Schema & Tuning",
    tabs: [
      {
        label: "Schema DDL",
        lang: "sql",
        code: `-- ================================================================
-- Banking Core Schema — PostgreSQL 15
-- Optimised for WAS connection pool + high transaction throughput
-- ================================================================

-- Schema isolation (set via JDBC currentSchema property)
CREATE SCHEMA IF NOT EXISTS banking;
SET search_path TO banking;

-- ---------------------------------------------------------------
-- ACCOUNTS TABLE
-- Partitioned by account type for large banks (10M+ accounts)
-- ---------------------------------------------------------------
CREATE TABLE banking.accounts (
    account_id      VARCHAR(20)     NOT NULL,
    customer_id     VARCHAR(20)     NOT NULL,
    account_type    VARCHAR(10)     NOT NULL CHECK (account_type IN ('SAVINGS','CURRENT','LOAN')),
    balance         NUMERIC(18,2)   NOT NULL DEFAULT 0.00,
    currency        CHAR(3)         NOT NULL DEFAULT 'USD',
    status          VARCHAR(10)     NOT NULL DEFAULT 'ACTIVE'
                                    CHECK (status IN ('ACTIVE','FROZEN','CLOSED')),
    branch_code     VARCHAR(10),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_accounts PRIMARY KEY (account_id),
    CONSTRAINT chk_balance CHECK (balance >= -999999.99) -- Allow small overdraft
) PARTITION BY LIST (account_type);

-- Partitions for performance (separate physical storage per type)
CREATE TABLE banking.accounts_savings  PARTITION OF banking.accounts FOR VALUES IN ('SAVINGS');
CREATE TABLE banking.accounts_current  PARTITION OF banking.accounts FOR VALUES IN ('CURRENT');
CREATE TABLE banking.accounts_loan     PARTITION OF banking.accounts FOR VALUES IN ('LOAN');

-- Indexes (critical for WAS JDBC query patterns)
CREATE INDEX idx_accounts_customer   ON banking.accounts (customer_id);
CREATE INDEX idx_accounts_status     ON banking.accounts (status) WHERE status = 'ACTIVE';
CREATE INDEX idx_accounts_branch     ON banking.accounts (branch_code, account_type);

-- ---------------------------------------------------------------
-- TRANSACTIONS TABLE
-- Partitioned by month (banks keep 7 years = 84 partitions)
-- ---------------------------------------------------------------
CREATE TABLE banking.transactions (
    txn_id          BIGSERIAL       NOT NULL,
    txn_ref         VARCHAR(40)     NOT NULL,
    from_account    VARCHAR(20),
    to_account      VARCHAR(20),
    amount          NUMERIC(18,2)   NOT NULL,
    currency        CHAR(3)         NOT NULL DEFAULT 'USD',
    txn_type        VARCHAR(20)     NOT NULL DEFAULT 'TRANSFER'
                                    CHECK (txn_type IN ('TRANSFER','DEPOSIT','WITHDRAWAL','FEE','INTEREST')),
    status          VARCHAR(15)     NOT NULL DEFAULT 'COMPLETED'
                                    CHECK (status IN ('PENDING','COMPLETED','REVERSED','FAILED')),
    channel         VARCHAR(10)     DEFAULT 'WEB',  -- WEB, ATM, BRANCH, API, MQ
    description     VARCHAR(255),
    mq_msg_id       VARCHAR(48),    -- MQ message ID for correlation
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_transactions PRIMARY KEY (txn_id, created_at),
    CONSTRAINT uq_txn_ref UNIQUE (txn_ref)
) PARTITION BY RANGE (created_at);

-- Monthly partitions (automate with pg_partman in production)
CREATE TABLE banking.transactions_2025_01 
    PARTITION OF banking.transactions
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE banking.transactions_2025_02
    PARTITION OF banking.transactions
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
-- ... (script generates remaining months)

-- Indexes on transactions
CREATE INDEX idx_txn_from_account ON banking.transactions (from_account, created_at DESC);
CREATE INDEX idx_txn_to_account   ON banking.transactions (to_account, created_at DESC);
CREATE INDEX idx_txn_created_at   ON banking.transactions (created_at DESC);
CREATE INDEX idx_txn_status       ON banking.transactions (status) WHERE status = 'PENDING';
CREATE INDEX idx_txn_mq_msg_id    ON banking.transactions (mq_msg_id) WHERE mq_msg_id IS NOT NULL;

-- ---------------------------------------------------------------
-- AUDIT LOG (append-only — regulatory requirement)
-- ---------------------------------------------------------------
CREATE TABLE banking.audit_log (
    audit_id        BIGSERIAL       PRIMARY KEY,
    txn_ref         VARCHAR(40),
    event_type      VARCHAR(30)     NOT NULL,
    from_account    VARCHAR(20),
    to_account      VARCHAR(20),
    amount          NUMERIC(18,2),
    user_id         VARCHAR(50),
    ip_address      INET,
    was_server      VARCHAR(50),    -- Which WAS node processed this
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
) WITH (fillfactor = 90);  -- Append-only: high fillfactor saves space

-- Partitioned by year for audit retention management
CREATE TABLE banking.audit_log_2025
    PARTITION OF banking.audit_log
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

-- ---------------------------------------------------------------
-- POSTGRESQL TUNING (postgresql.conf recommendations)
-- For WAS connection pool: 50 connections × 2 nodes = 100 max
-- ---------------------------------------------------------------

/*
# postgresql.conf — Banking Production Tuning

# Connections
max_connections = 200              # Buffer above WAS pool max (100)
superuser_reserved_connections = 5

# Memory (assume 32GB server)
shared_buffers = 8GB               # 25% of RAM
effective_cache_size = 24GB        # 75% of RAM
work_mem = 64MB                    # Per-query sort/hash (careful: max_conns × this)
maintenance_work_mem = 2GB         # VACUUM, CREATE INDEX

# WAL (Write-Ahead Log) — banking durability
wal_level = replica                # Required for standby
synchronous_commit = on            # NEVER set off for banking (data loss risk!)
checkpoint_completion_target = 0.9
wal_buffers = 64MB
max_wal_size = 4GB

# Query planner
random_page_cost = 1.1            # SSD storage (vs 4.0 for HDD)
effective_io_concurrency = 200    # SSD IOPS
default_statistics_target = 200   # Better query plans for banking queries

# Logging (for WAS slow query correlation)
log_min_duration_statement = 500  # Log queries >500ms
log_lock_waits = on               # Log lock waits
log_checkpoints = on
log_connections = on              # For WAS pool tracking
log_disconnections = on
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '

# Autovacuum (keep tables clean for banking throughput)
autovacuum_vacuum_cost_delay = 2ms
autovacuum_max_workers = 6
autovacuum_naptime = 30s
*/

-- ---------------------------------------------------------------
-- READ-ONLY USER (for reporting, never use app user for reads)
-- ---------------------------------------------------------------
CREATE ROLE banking_ro LOGIN PASSWORD 'readonly_secure_password';
GRANT CONNECT ON DATABASE banking_core TO banking_ro;
GRANT USAGE ON SCHEMA banking TO banking_ro;
GRANT SELECT ON ALL TABLES IN SCHEMA banking TO banking_ro;

-- Application user (minimal privileges)
CREATE ROLE banking_app LOGIN PASSWORD 'app_secure_password';
GRANT CONNECT ON DATABASE banking_core TO banking_app;
GRANT USAGE ON SCHEMA banking TO banking_app;
GRANT SELECT, INSERT, UPDATE ON banking.accounts TO banking_app;
GRANT SELECT, INSERT ON banking.transactions TO banking_app;
GRANT INSERT ON banking.audit_log TO banking_app;
REVOKE DELETE ON ALL TABLES IN SCHEMA banking FROM banking_app;  -- No deletes allowed!`,
      },
    ],
  },
};

// ----------- UI COMPONENTS -----------

function CodeBlock({ code, lang }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div style={{ position: "relative", background: "#0d1117", borderRadius: 10, overflow: "hidden", border: "1px solid #30363d" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 14px", background: "#161b22", borderBottom: "1px solid #30363d" }}>
        <span style={{ fontSize: 11, color: "#8b949e", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 1 }}>{lang}</span>
        <button onClick={copy} style={{ background: copied ? "#238636" : "#21262d", color: copied ? "#fff" : "#8b949e", border: "1px solid #30363d", borderRadius: 6, padding: "3px 10px", fontSize: 11, cursor: "pointer", transition: "all 0.2s" }}>
          {copied ? "✓ Copied" : "Copy"}
        </button>
      </div>
      <pre style={{ margin: 0, padding: "16px", overflowX: "auto", fontSize: 12, lineHeight: 1.7, color: "#e6edf3", fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', monospace", whiteSpace: "pre", maxHeight: 480 }}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

function SectionContent({ id }) {
  const data = CODE[id];
  const [activeTab, setActiveTab] = useState(0);

  if (!data) return <div style={{ color: "#8b949e", padding: 40, textAlign: "center" }}>Content loading…</div>;

  const tab = data.tabs[activeTab];

  return (
    <div>
      <h2 style={{ color: "#58a6ff", fontFamily: "'IBM Plex Mono', monospace", fontSize: 18, marginBottom: 20, paddingBottom: 10, borderBottom: "1px solid #21262d" }}>{data.title}</h2>
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {data.tabs.map((t, i) => (
          <button key={i} onClick={() => setActiveTab(i)} style={{
            padding: "6px 14px", borderRadius: 20, fontSize: 12, cursor: "pointer", fontFamily: "monospace",
            background: activeTab === i ? "#1f6feb" : "#21262d",
            color: activeTab === i ? "#fff" : "#8b949e",
            border: activeTab === i ? "1px solid #388bfd" : "1px solid #30363d",
            transition: "all 0.2s",
          }}>{t.label}</button>
        ))}
      </div>
      <CodeBlock code={tab.code} lang={tab.lang} />
    </div>
  );
}

function OverviewSection() {
  return (
    <div>
      <h2 style={{ color: "#58a6ff", fontFamily: "'IBM Plex Mono', monospace", fontSize: 18, marginBottom: 20, paddingBottom: 10, borderBottom: "1px solid #21262d" }}>Banking EAR Architecture — WebSphere 9.x + PostgreSQL 15</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 24 }}>
        {[
          { title: "Request Flow", items: ["Browser → HTTPS → IHS (port 443)", "IHS mod_was_ap22 → WAS Plugin", "Plugin → Cluster (Round-Robin + Affinity)", "WAS → BankingServlet → EJB → DAO", "DAO → PostgreSQL (XA JDBC)", "Response path reversed back to client"] },
          { title: "HA / Failover", items: ["2-node WAS cluster (banknode01/02)", "IHS with plugin-cfg.xml auto-refresh (60s)", "Session replication: Memory-to-Memory", "Failover: Primary down → Plugin routes to backup", "Rolling restart: zero-downtime with weight=0 drain", "PostgreSQL streaming replication (hot standby)"] },
          { title: "Security Layers", items: ["TLS 1.3 on IHS + WAS (PCI-DSS)", "JAAS J2C auth aliases (no hardcoded passwords)", "JACC role-based access (RBAC)", "PostgreSQL SSL mutual auth (verify-full)", "MQ channel SSL (TLS_RSA_WITH_AES_256)", "Audit log: every transaction immutably logged"] },
          { title: "Key Components", items: ["EAR: BankingApp.ear (EJB + WAR)", "BankingTransactionBean (SLSB, CMT, XA)", "BankTransactionMDB (MQ consumer, 2PC)", "BankingDAO (PostgreSQL, server-cursor)", "FraudDetectionService (sync pre-commit)", "wsadmin toolkit (Python/Jython admin scripts"] },
        ].map((card, i) => (
          <div key={i} style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: 18 }}>
            <div style={{ color: "#f0a742", fontFamily: "monospace", fontSize: 13, fontWeight: 700, marginBottom: 12 }}>{card.title}</div>
            <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {card.items.map((item, j) => (
                <li key={j} style={{ color: "#c9d1d9", fontSize: 12, lineHeight: 1.8, paddingLeft: 14, position: "relative" }}>
                  <span style={{ position: "absolute", left: 0, color: "#3fb950" }}>›</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Architecture Diagram */}
      <div style={{ background: "#0d1117", border: "1px solid #30363d", borderRadius: 10, padding: 20, fontFamily: "monospace", fontSize: 12, color: "#8b949e", lineHeight: 2, overflowX: "auto" }}>
        <div style={{ color: "#58a6ff", fontWeight: 700, marginBottom: 12 }}>// DEPLOYMENT TOPOLOGY</div>
        <pre style={{ margin: 0, color: "#c9d1d9" }}>{`
  ┌─────────────────────────────────────────────────────────────────┐
  │                    BANKING PRODUCTION                           │
  │                                                                 │
  │  ┌──────────────┐     ┌────────────────────────────────────┐   │
  │  │   Browser    │     │      IBM HTTP Server (IHS)         │   │
  │  │  (HTTPS:443) │────▶│   bankportal.prod.bank.com         │   │
  │  └──────────────┘     │   mod_was_ap22_http.so             │   │
  │                       │   plugin-cfg.xml (60s refresh)     │   │
  │                       └──────────────┬─────────────────────┘   │
  │                                      │ WAS Plugin               │
  │              ┌───────────────────────┴───────────────┐          │
  │              │                                       │          │
  │   ┌──────────▼──────────┐             ┌─────────────▼────────┐ │
  │   │  banknode01 (WAS)   │             │  banknode02 (WAS)    │ │
  │   │  BankAppServer1     │◀──session──▶│  BankAppServer2      │ │
  │   │  weight=2 (primary) │  replication│  weight=1 (secondary)│ │
  │   │  JVM: 4GB heap      │             │  JVM: 4GB heap       │ │
  │   │  WebContainer:100t  │             │  WebContainer:100t   │ │
  │   └──────────┬──────────┘             └──────────────────────┘ │
  │              │ XA Transaction (2PC)                             │
  │   ┌──────────┴──────────────────────────┐                       │
  │   │                                     │                       │
  │   ▼                                     ▼                       │
  │  ┌─────────────────┐      ┌─────────────────────────┐          │
  │  │  PostgreSQL 15  │      │   IBM MQ 9.x            │          │
  │  │  (Primary +     │      │   BANK.QMGR             │          │
  │  │   Standby)      │      │   BANK.TXN.REQUEST.Q    │          │
  │  │  port 5432/SSL  │      │   BANK.TXN.DLQ          │          │
  │  │  banking schema │      │   port 1414/TLS         │          │
  │  └─────────────────┘      └─────────────────────────┘          │
  └─────────────────────────────────────────────────────────────────┘
`}</pre>
      </div>
    </div>
  );
}

export default function App() {
  const [active, setActive] = useState("overview");

  return (
    <div style={{ display: "flex", height: "100vh", background: "#010409", color: "#c9d1d9", fontFamily: "'IBM Plex Sans', 'Segoe UI', system-ui, sans-serif", overflow: "hidden" }}>
      {/* Sidebar */}
      <div style={{ width: 230, background: "#0d1117", borderRight: "1px solid #21262d", display: "flex", flexDirection: "column", flexShrink: 0, overflowY: "auto" }}>
        <div style={{ padding: "18px 14px 14px", borderBottom: "1px solid #21262d" }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#58a6ff", fontFamily: "'IBM Plex Mono', monospace", letterSpacing: -0.5 }}>🏦 Banking EAR</div>
          <div style={{ fontSize: 10, color: "#8b949e", marginTop: 3, fontFamily: "monospace" }}>WAS 9.x + PostgreSQL 15</div>
          <div style={{ marginTop: 8, display: "flex", gap: 4, flexWrap: "wrap" }}>
            {["PCI-DSS", "HA", "XA"].map(t => (
              <span key={t} style={{ fontSize: 9, padding: "2px 6px", borderRadius: 10, background: "#1f2937", color: "#60a5fa", border: "1px solid #1d4ed8", fontFamily: "monospace" }}>{t}</span>
            ))}
          </div>
        </div>
        <nav style={{ flex: 1, padding: "8px 0" }}>
          {SECTIONS.map(s => (
            <button key={s.id} onClick={() => setActive(s.id)} style={{
              display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left",
              padding: "9px 14px", fontSize: 12, cursor: "pointer", border: "none",
              background: active === s.id ? "#1f6feb22" : "transparent",
              color: active === s.id ? "#58a6ff" : "#8b949e",
              borderLeft: active === s.id ? "3px solid #1f6feb" : "3px solid transparent",
              transition: "all 0.15s",
            }}>
              <span style={{ fontSize: 14 }}>{s.icon}</span>
              <span style={{ lineHeight: 1.3 }}>{s.label}</span>
            </button>
          ))}
        </nav>
        <div style={{ padding: "12px 14px", borderTop: "1px solid #21262d", fontSize: 10, color: "#484f58", fontFamily: "monospace", lineHeight: 1.8 }}>
          <div>WAS 9.0.5.x ND</div>
          <div>IHS 9.0</div>
          <div>MQ 9.3.x</div>
          <div>PostgreSQL 15.x</div>
          <div>Java 11 (IBM JDK)</div>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
        {active === "overview" ? <OverviewSection /> : <SectionContent id={active} />}
      </div>
    </div>
  );
}
