# Build and Deploy the Application

## Install the Build Tool
1. Install Java

```
sudo dnf install -y java-1.8.0-openjdk-devel
java -version
```
2. Install GIT
```
sudo dnf install git -y
```

4. Install Maven

```
sudo dnf install -y maven
mvn -version
```
5. Clone the Repository
```
git clone <Repo-URL>
```
## Build the Application

From the project directory.
```
mvn clean package
```
Generated artifact ==> digistack-bank-ear/target/digistack-bank-v1.ear

# Deploy the Application
1. Log into Admin Console: https://<vm-ip>:9043/ibm/console
2. Go to: Applications → New Application → New Enterprise Application
3. Choose Remote file system (since the EAR is already on the VM, not your browser's machine) → Browse → navigate to /opt/staging/ears/digistack-bank-v1.ear → Next
4. Choose Fast Path (the simplified wizard, appropriate for a first deploy) → Next
5. On the Select Installation Options screen:
		Leave defaults, confirm Application name shows digistack-bank-v1 (or similar, auto-derived from the EAR)
		Click Next
6. On Map Modules to Servers:
		Select the digistack-bank-web module checkbox
		Confirm the target server shown is server1 on node devdsbinnode01
		Click Next
7. On Map Virtual Host for Web Modules:
		Select the digistack-bank-web module checkbox
		Set Virtual host to default_host (WAS's built-in virtual host — sufficient for this lab; a dedicated virtual host isn't required until multi-app routing needs it)
		Click Next
8. Continue through remaining screens (context root should already show /digistack-bank from our EAR's pom.xml) → click Next through to Summary
9. Click Finish
10. Wait for installation to complete (progress bar/log output appears) — then click the Save link to commit to the master configuration.


# Verification
1. Open a browser and go to:
```
http://dsb-dmgr.digistack.cloud:9080/digistack-bank/
```
Expected result: Page displays: ==> "DB Read Successful: DigiStack Bank is live - Version 1"

2. Confirm the log entry
On dsb-dmgr, run:
```
grep "AppConfigTestServlet" /apps/IBM/WebSphere/AppServer/profiles/devdsbinappserver01/logs/server1/SystemOut.log
```
