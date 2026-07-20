# Banking EAR Application — WAS 9.x + PostgreSQL 15
## Production-Grade Implementation (10-Year WAS Expert Level)

### Project Structure
```
BankingApp.ear/
├── BankingEJB.jar          # EJB module (Session Beans, MDB)
│   ├── BankingTransactionBean.java   (SLSB, CMT, XA)
│   ├── BankTransactionMDB.java       (MQ consumer, 2PC)
│   └── BankingDAO.java               (PostgreSQL DAO)
├── BankingWeb.war           # Web module (Servlets)
│   └── BankingServlet.java           (REST endpoints)
└── META-INF/application.xml

Config/
├── was/plugin-cfg.xml       # IHS WAS Plugin (session affinity)
├── was/httpd.conf           # IHS config (TLS 1.3, PCI headers)
├── wsadmin/                 # Jython admin scripts
│   ├── create_datasource.py
│   ├── configure_mq.py
│   ├── create_cluster.py
│   └── admin_toolkit.py
├── ssl/                     # Certificate management
└── mq/                      # MQ queue definitions

Scripts/
├── failover_test.sh         # Cluster failover validation
├── jvm_troubleshoot.sh      # JVM diagnostic toolkit
└── production_runbook.sh    # P1/P2 incident runbook

PostgreSQL/
└── schema.sql               # Banking schema (partitioned)
```

### Key Architecture Decisions

| Concern | Decision | Rationale |
|---------|----------|-----------|
| EJB Type | Stateless Session Bean | Cluster-safe, pool-friendly |
| TX Management | CMT (Container-Managed) | WAS coordinates XA 2PC |
| DB Isolation | SERIALIZABLE for writes | Prevents banking race conditions |
| Session Replication | Memory-to-Memory | Zero data loss on node failure |
| MQ Messaging | XA activation spec | Atomic with DB (no duplicate transactions) |
| GC Policy | gencon (-Xgcpolicy:gencon) | Best for short-lived txn objects |
| Heap | 2GB initial / 4GB max | 50% of available RAM rule |
| DB Pool | min=10, max=50 per node | Tune via load test |
| TLS | 1.3 only (1.2 fallback) | PCI-DSS requirement |

### 10-Year Production Tips

1. **IHS Plugin**: Always set `RetryInterval="60"` and `ServerIOTimeout="900"` for banking SLAs
2. **JDBC Pool**: Set `purgePolicy=EntirePool` — on stale connection, refresh all (banking safety)
3. **MQ MDB**: `maxBatchSize=1` is non-negotiable for financial transactions (exactly-once)
4. **Thread Dumps**: Use `kill -3` on IBM JVM, then IBM TMDA tool for analysis
5. **GC Logs**: Enable `-verbose:gc` always; analyze with IBM GCMV before tuning heap
6. **PostgreSQL**: `synchronous_commit=on` ALWAYS — never sacrifice durability for performance
7. **Rolling Restart**: Set `weight=0` in wsadmin, wait 60s for drain, then restart
8. **Fraud Detection**: Run synchronously BEFORE committing — never async pre-commit
9. **Audit Logs**: Append-only table, never allow DELETE on banking_app role
10. **CTR Reporting**: Use `REQUIRES_NEW` transaction so compliance notification is independent

### wsadmin Quick Reference
```bash
# Deploy application
wsadmin.sh -lang jython -f admin_toolkit.py -- deploy /apps/BankingApp.ear BankingApp /banking

# Health check
wsadmin.sh -lang jython -f admin_toolkit.py -- health

# Set environment variables
wsadmin.sh -lang jython -f admin_toolkit.py -- env

# Create datasource
wsadmin.sh -lang jython -f create_datasource.py

# Configure MQ
wsadmin.sh -lang jython -f configure_mq.py
```

### JVM Troubleshooting Quick Reference
```bash
# OOM diagnosis
./jvm_troubleshoot.sh oom

# Thread hang (generates javacore)
./jvm_troubleshoot.sh hang

# High CPU analysis
./jvm_troubleshoot.sh cpu

# Real-time monitoring
./jvm_troubleshoot.sh monitor
```

### PostgreSQL Connection Check from WAS
```python
# wsadmin one-liner
wsadmin.sh -lang jython -c "AdminControl.invoke(AdminControl.queryNames('*:type=DataSource,name=BankingDS*'), 'testConnection', '', '')"
```
