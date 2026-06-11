#!/bin/bash
# =============================================================
# setup-phase1.sh — Full Phase 1 setup for Banking App on WAS + PostgreSQL
# Run as: chmod +x setup-phase1.sh && sudo ./setup-phase1.sh
# Tested on Ubuntu 22.04 LTS
# =============================================================

set -e  # Exit on any error

WAS_HOME="/opt/IBM/WebSphere/AppServer"
PROFILE_NAME="BankingProfile"
PROFILE_HOME="${WAS_HOME}/profiles/${PROFILE_NAME}"
SERVER_NAME="BankingServer"
WAS_ADMIN="wasadmin"
WAS_PASS="Admin@12345"
PG_VERSION="15"
JDBC_JAR="postgresql-42.7.3.jar"
JDBC_URL="https://jdbc.postgresql.org/download/${JDBC_JAR}"

echo "======================================================"
echo "  Banking App - Phase 1 Setup"
echo "======================================================"

# ---------- 1. Install PostgreSQL ----------
echo ""
echo "[1/8] Installing PostgreSQL ${PG_VERSION}..."
apt-get update -q
apt-get install -y postgresql postgresql-contrib curl wget

systemctl enable postgresql
systemctl start postgresql
echo "  PostgreSQL installed and started."

# ---------- 2. Configure PostgreSQL ----------
echo ""
echo "[2/8] Configuring PostgreSQL..."

# Create DB user and database
sudo -u postgres psql <<EOF
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'bankadmin') THEN
    CREATE USER bankadmin WITH PASSWORD 'Bank@12345';
    RAISE NOTICE 'User bankadmin created.';
  END IF;
END
\$\$;

SELECT 'CREATE DATABASE bankingdb OWNER bankadmin'
  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'bankingdb')\gexec
GRANT ALL PRIVILEGES ON DATABASE bankingdb TO bankadmin;
EOF

# Update pg_hba.conf
PG_HBA="/etc/postgresql/${PG_VERSION}/main/pg_hba.conf"
if ! grep -q "bankadmin" "${PG_HBA}"; then
    echo "host    bankingdb   bankadmin   127.0.0.1/32    md5" >> "${PG_HBA}"
    echo "host    bankingdb   bankadmin   ::1/128         md5" >> "${PG_HBA}"
fi

# Update postgresql.conf
PG_CONF="/etc/postgresql/${PG_VERSION}/main/postgresql.conf"
sed -i "s/^#max_connections.*/max_connections = 100/" "${PG_CONF}"
sed -i "s/^#shared_buffers.*/shared_buffers = 1GB/" "${PG_CONF}"
sed -i "s/^#work_mem.*/work_mem = 16MB/" "${PG_CONF}"
sed -i "s/^#log_connections.*/log_connections = on/" "${PG_CONF}"
sed -i "s/^#log_min_duration_statement.*/log_min_duration_statement = 500/" "${PG_CONF}"

systemctl reload postgresql
echo "  PostgreSQL configured."

# ---------- 3. Run Schema DDL ----------
echo ""
echo "[3/8] Creating banking schema..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
psql -h 127.0.0.1 -U bankadmin -d bankingdb -f "${SCRIPT_DIR}/../config/postgresql/schema.sql"
echo "  Schema created."

# ---------- 4. Download PostgreSQL JDBC Driver ----------
echo ""
echo "[4/8] Downloading PostgreSQL JDBC driver..."
JDBC_DIR="${WAS_HOME}/lib/ext/postgresql"
mkdir -p "${JDBC_DIR}"
if [ ! -f "${JDBC_DIR}/${JDBC_JAR}" ]; then
    wget -q "${JDBC_URL}" -O "${JDBC_DIR}/${JDBC_JAR}"
    echo "  Downloaded: ${JDBC_DIR}/${JDBC_JAR}"
else
    echo "  JDBC driver already present, skipping download."
fi

# ---------- 5. Create WAS Profile ----------
echo ""
echo "[5/8] Creating WAS profile (${PROFILE_NAME})..."
if [ ! -d "${PROFILE_HOME}" ]; then
    "${WAS_HOME}/bin/manageprofiles.sh" -create \
        -profileName  "${PROFILE_NAME}" \
        -profilePath  "${PROFILE_HOME}" \
        -templatePath "${WAS_HOME}/profileTemplates/default" \
        -serverName   "${SERVER_NAME}" \
        -hostName     localhost \
        -enableAdminSecurity true \
        -adminUserName "${WAS_ADMIN}" \
        -adminPassword "${WAS_PASS}"
    echo "  Profile created."
else
    echo "  Profile already exists, skipping."
fi

# ---------- 6. Start WAS ----------
echo ""
echo "[6/8] Starting WAS server..."
"${PROFILE_HOME}/bin/startServer.sh" "${SERVER_NAME}" || true
sleep 10
"${PROFILE_HOME}/bin/serverStatus.sh" "${SERVER_NAME}"

# ---------- 7. Run WAS Setup Script (JDBC, DS, JVM) ----------
echo ""
echo "[7/8] Running WAS admin setup (JDBC provider, datasource, JVM tuning)..."
"${PROFILE_HOME}/bin/wsadmin.sh" \
    -lang jython \
    -username "${WAS_ADMIN}" \
    -password "${WAS_PASS}" \
    -f "${SCRIPT_DIR}/was-setup.py"

# ---------- 8. Restart WAS for JVM changes ----------
echo ""
echo "[8/8] Restarting WAS to apply JVM settings..."
"${PROFILE_HOME}/bin/stopServer.sh"  "${SERVER_NAME}" -username "${WAS_ADMIN}" -password "${WAS_PASS}"
sleep 5
"${PROFILE_HOME}/bin/startServer.sh" "${SERVER_NAME}"
sleep 15

echo ""
echo "======================================================"
echo "  Phase 1 Setup Complete!"
echo "======================================================"
echo ""
echo "  WAS Admin Console : https://localhost:9043/ibm/console"
echo "  App URL (after deploy): http://localhost:9080/banking/health"
echo ""
echo "  Next step: Build and deploy the EAR"
echo "    mvn clean package -f ${SCRIPT_DIR}/../pom.xml"
echo "    cp BankingEAR/target/BankingEAR-1.0.0.ear /opt/deployments/BankingApp.ear"
echo "    wsadmin.sh ... -f ${SCRIPT_DIR}/deploy.py"
echo ""
