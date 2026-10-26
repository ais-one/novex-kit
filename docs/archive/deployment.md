# Dev Tools

## Optional VS Code Plugins

**NOTE** Useful plugins if using VS Code:

- Essentials
  - Docker
  - Live Server
  - REST Client
  - SFTP
  - Database Client JDBC
  - JS Language Specific
    - es6-string-html
    - ESLint
    - Volar (for VueJS)
    - Prettier
  - Remote SSH & Remote Explorer
- Recommended
  - SonarLint (requires java)
  - GitLens

## Chrome Extensions

- SAML / OIDC
  - https://chrome.google.com/webstore/detail/saml-ws-federation-and-oa/hkodokikbjolckghdnljbkbhacbhpnkb?hl=en
- MetaMask
  - https://chrome.google.com/webstore/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn?hl=en

## Other Utilities

- DB clients
  - dbeaver (mac / windows)
  - heidisql (windows)

## Apps Setup

### OpenJDK Setup

https://stackoverflow.com/questions/52511778/how-to-install-openjdk-11-on-windows

Extract the zip file into a folder, e.g. C:\Program Files\Java\ and it will create a jdk-11 folder (where the bin folder is a direct sub-folder). You may need Administrator privileges to extract the zip file to this location.

Set a PATH:

Select Control Panel and then System.
Click Advanced and then Environment Variables.
Add the location of the bin folder of the JDK installation to the PATH variable in System Variables.
The following is a typical value for the PATH variable: C:\WINDOWS\system32;C:\WINDOWS;"C:\Program Files\Java\jdk-11\bin"
Set JAVA_HOME:

Under System Variables, click New.
Enter the variable name as JAVA_HOME.
Enter the variable value as the installation path of the JDK (without the bin sub-folder).
Click OK.
Click Apply Changes.
Configure the JDK in your IDE (e.g. IntelliJ or Eclipse).
You are set.

To see if it worked, open up the Command Prompt and type java -version and see if it prints your newly installed JDK.

If you want to uninstall - just undo the above steps.

Note: You can also point JAVA_HOME to the folder of your JDK installations and then set the PATH variable to %JAVA_HOME%\bin. So when you want to change the JDK you change only the JAVA_HOME variable and leave PATH as it is.


# Deployment Sample

The following are the environments

- development (used for local development)
- uat & higher (e.g production)

### development environment

The development environment is on a local machine used by developers.

Docker compose can be used to set up supporting applications such as Redis, ElasticSearch, Kafka, etc.

### uat (and higher) environment

The UAT, production and (optional staging) environments are on the cloud provider.

Use services that are common/similar in multiple cloud providers

- Domain name verification
- cloudflare
  - DNS (for API, for frontend)
  - full SSL (can be self-signed at server side)
- frontend - GCP object storage, https
- backend - docker-> Google Cloud Run, https
  - OPTION deploy to GCP Group Instances (need to set load balancer and networking) **WIP**
  - OPTION deploy to GKE **WIP**
- Mongodb - Mongo Atlas
- files - Google object storage
- Mysql/Postgres - RDS
- user_session - same as Mongodb

## Current Manual Deployment Script

In GCP

- setup service account in IAM with appropriate permissions
- enable and setup a storage bucket to serve webpage
  - you may need to have a domain name
- enable Cloud Run and Container Registry

---

## Cloud Provider Specific SDKs

You need to know about SDK from each cloud provider to use them effectively

Google Cloud Platform - See [../gcp/home.md](../gcp/home.md)

## Scalable Deployment On Cloud (GCP)

- Database
  - RDS (Postgresql or Mysql)
- Memory Key-Value Store (redis -> valkey)
  - https://cloud.google.com/memorystore/docs/redis
  - Redis Labs - https://app.redislabs.com/
- MQ
  - cron + lambda
  - redis pub-sub
  - better-queue (simple)
  - Google Pubsub https://cloud.google.com/pubsub/docs

---

4. CloudFlare

- We do not use https://cloud.google.com/load-balancing/docs/ssl-certificates
- SSL Strategies
  - Flexible: SSL User --> SSL --> CF --> GCP
  - Full: SSL User --> SSL --> CF --> SSL --> GCP
- Redirect
  - always redirect http to https

## CORS

CORS Origin settings will follow frontend name - e.g. https://app.mybot.live

# DEPLOYMENT ON CLOUD (OPTIONAL)

## SSH Keys For use with ssh, scp

generate private and public keys

```bash
# -t dsa|rsa|ecdsa|ed25519
# -b 521|2048...
ssh-keygen -f ./id_rsa -t rsa -b 2048
```

## SSL Certs For use with on web applications

1. generate self-signed cert

```bash
# private key: privkey.pem
# public cert self-signed: fullchain.pem
# -nodes = no DES if not pass phrase
# -subj "/C=SG/ST=Singapore/L=Singapore/O=My Group/OU=My Unit/CN=127.0.0.1"
openssl req -x509 -newkey rsa:2048 -keyout privkey.pem -out fullchain.pem -days 3650 -nodes  -subj "/CN=127.0.0.1"
```

2. generate private key and CSR

```bash
openssl req -new -newkey rsa:2048 -nodes -keyout id_rsa -out id_rsa.csr -days 3650 -subj "/CN=127.0.0.1"
```

alternative generate only private key

```bash
# linux
openssl genrsa -des3 -out id_rsa 2048

# windows
openssl genrsa -out id_rsa 2048
```

3. generate CSR from exiting private key

```bash
openssl req -new -key id_rsa -out id_rsa.csr -subj "/CN=127.0.0.1"
```

## Generate SSL Keys using Certbot

https://certbot.eff.org/

```bash
$ sudo apt-get update
$ sudo apt-get install -y software-properties-common
$ sudo add-apt-repository ppa:certbot/certbot
$ sudo apt-get update
$ sudo apt-get install certbot
```

https://certbot.eff.org/docs/using.html#renewing-certificates

```bash
sudo service apache2 stop
# sudo certbot certonly --standalone -d <subdomain>.example.com
sudo certbot certonly --standalone --preferred-challenges http -d <domain>
sudo service apache2 start
```

### Test Renewal

```bash
sudo certbot renew --dry-run --pre-hook "sudo service apache2 stop" --post-hook "sudo service apache2 start"
```

### Live Renewal in crontab

```bash
sudo certbot renew --pre-hook "sudo service apache2 stop" --post-hook "sudo service apache2 start"
```

### so you can read renewed certs

```bash
sudo su
chmod +rx /etc/letsencrypt/live
chmod +rx /etc/letsencrypt/archive
```

## Using port below 1024

### Method 1 - Use Authbind (Preferred)

http://pm2.keymetrics.io/docs/usage/specifics/#listening-on-port-80-w-o-root

```bash
sudo apt-get install authbind
sudo touch /etc/authbind/byport/443
sudo chown ubuntu /etc/authbind/byport/443
sudo chmod 755 /etc/authbind/byport/443
```

```bash
~/.bashrc
alias pm2='authbind --deep pm2'
```

source ~/.bashrc

**package.json**
"production-start": "ssh -i ../../test.pem ubuntu@127.0.0.1 \"cd ~/api; authbind --deep pm2 start --only api --env production;\"",
"production-stop": "ssh -i ../../test.pem ubuntu@127.0.0.1 \"cd ~/api; pm2 delete api;\"",

### Method 2 - Create Safe User

https://www.digitalocean.com/community/tutorials/how-to-use-pm2-to-setup-a-node-js-production-environment-on-an-ubuntu-vps

## Running on VM (eg. Droplet / EC2 / GCE)

### use pm2

look for `ecosystem.config.js`

### Note

https://stackoverflow.com/questions/2953081/how-can-i-write-a-heredoc-to-a-file-in-bash-script

```bash
cat << 'EOF' > /tmp/yourfilehere
The variable $FOO will not be interpreted.
EOF
```

# curl -G "https://api.telegram.org/bot000000000:XXXXxxxxxxxxxxXXXXXXXXXX_xxxxxxxxxx/sendMessage?chat_id=183XXXXXX" --data-urlencode "text=Login IP `date`" > /dev/null

#!/bin/bash

TCP_CONN=`netstat -on | grep 3005 | wc -l`

echo $TCP_CONN

if [ "$TCP_CONN" -gt 2048 ]; then
echo 'LHS: GT5 '+$TCP_CONN
curl -X GET "https://sms.era.sg/tg_out.php?user=aaronjxz&msg=TCP%20overlimit%20${TCP_CONN}"
else
echo 'LHS: LTE5 '+$TCP_CONN
fi

#!/bin/bash
#free && sync
#sudo sh -c 'echo 3 >/proc/sys/vm/drop_caches'
#free

HI="LHS: CPU `LC_ALL=C top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}'`% RAM `free -m | awk '/Mem:/ { printf("%3.1f%%", $3/$2*100) }'` HDD `df -h / | awk '/\// {print $(NF-1)}'`"

# echo $HI

TCP_CONN=`netstat -on | grep 3005 | wc -l`

curl -G "https://sms.era.sg/tg_out.php?user=aaronjxz" --data-urlencode "msg=$HI TCP:$TCP_CONN"

#CPU=`grep 'cpu ' /proc/stat | awk '{usage=($2+$4)*100/($2+$4+$5)} END {print usage "%"}'`
#echo $CPU

# Configuring systemd to Run Multiple Instances

https://nodesource.com/blog/running-your-node-js-app-with-systemd-part-2

```bash
cat << 'EOF' > /lib/systemd/system/hello_env@.service
[Unit]
Description=hello_env.js - making your environment variables rad
Documentation=https://example.com
After=network.target

[Service]
# Environment=NODE_PORT=%i
Type=simple
User=chl
ExecStart=/usr/bin/node /home/chl/hello_env.js --config /home/ubuntu/%i
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF
```

```bash
for port in $(seq 3001 3004); do sudo systemctl start hello_env@$port; done
```

```bash
#!/bin/bash -e

PORTS="3001 3002 3003 3004"

for port in ${PORTS}; do
  systemctl stop hello_env@${port}
done

exit 0
```

## nginx

```bash
sudo apt-get update
sudo apt-get -y install nginx-full
sudo rm -fv /etc/nginx/sites-enabled/default

cat << 'EOF' > /etc/nginx/sites-enabled/hello_env.conf
upstream hello_env {
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
    server 127.0.0.1:3003;
    server 127.0.0.1:3004;
}
server {
    listen 80 default_server;
    server_name _;

    location / {
        proxy_pass http://hello_env;
        proxy_set_header Host $host;
    }
}
EOF

sudo systemctl restart nginx
```

## Fail2ban

https://www.techrepublic.com/article/how-to-install-fail2ban-on-ubuntu-server-18-04/

```bash
sudo apt-get install -y fail2ban
sudo systemctl start fail2ban
sudo systemctl enable fail2ban

cat << 'EOF' > /etc/fail2ban/jail.local
[sshd]
enabled = true
port = 22
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
EOF

sudo systemctl restart fail2ban

sudo fail2ban-client set sshd unbanip IP_ADDRESS
```

## Installation - NodeJS

use nvm


# Docker / Podman

## Backend Application

Reference - https://nodejs.org/de/docs/guides/nodejs-docker-webapp/

```Dockerfile
# build the container
# replace "ais-one/node-web-app" with your own image name
# -f is path from cookbook folder
docker build -t ais-one/node-web-app:latest -f js-node/expressjs/Dockerfile .

## NOT USED: docker run -it -d ais-one/node-web-app /bin/bash
# run the container
docker run -p 3000:3000 -p 3001:3001 -d ais-one/node-web-app

# check running container id
docker ps

# to check logs
docker logs <container id>
```

To access container command line

```bash
docker exec -it <container id> /bin/bash

# Example should be Running on http://localhost:3000
```

```bash
# to save an image
docker save image:tag | gzip > image-tag.tar.gz

# TODO load an image from tar.gz
```

## Docker Commands

```bash
docker ps
docker container ls -a
docker container rm <contianer>
docker container run <contianer>
docker container stop <contianer>
docker container start <contianer>
docker container port
docker container prune
docker image ls
docker image rm <image>

# build with
docker build -t <your username>/node-web-app:latest .
# OR
docker build -t node-web-app:latest .

# make container and run the image
docker run -p 49160:8080 -d <your username>/node-web-app


docker stop $(docker ps -a -q)
docker rm $(docker ps -a -q)
docker rmi $(docker images -q)

# save image to file
docker save $IMAGE:$TAG | gzip > $IMAGE-$TAG.tar.gz

# create image from file
docker image load -i $IMAGE-$TAG.tar.gz

# If using WSL2 for Docker, make sure time is sync
# https://stackoverflow.com/questions/65086856/wsl2-clock-is-out-of-sync-with-windows
sudo hwclock -s
```

## Secrets Management

### Considerations

It is important to manage your secrets

Need to take into consideration, the following:

- CICD environment
- Auto Scaling in Container Orchestration, bad practice to keep replicating
- Need encryption at rest
- Purpose, e.g. seperation of GCP Keys for deployment, GCP keys for service usage
- Where to place them, side car, secret manager etc.

### Secret Managers

- Hashicorp Vault
  - self hosted, docker
  - helm, sidecar
  - vault + mongoatlas
- Google Secrets
- AWS Secrets
- www.cyberark.com
- DIY?

### Deployment Environment Variables

Environment to consider If $CI === true

If non CI just

```bash

# not used not for CI passed in as $1 in deploy.sh
NODE_ENV=

APP_NAME=for backend only docker image name

# GCP Storage Bucket Name for frontend deployment
BUCKET_NAME=

# Cloud Provider
GCP_PROJECT_ID=

# Service key (from deploy folder if local deploy, env cicd env otherwise)
GCP_PROJECT_KEY=

# Vault Info (use config files if no vault) if VAULT=unused, do not call vault
VAULT=
```

### Use Of Files Or Not

- Cloud Service Keys - Deployment
  - Local - file
  - cloud
    - manual
      - file
        - cicd
      - env
- Knexfile - Database Migration
  - local - file
  - cloud
    - manual
      - file
        - cicd
      - na

### Serving Configs

- RSA public and private keys for JWT
  - should be served from a authentication sidecar
  - should be served from secrets manager (JSON/JS)
  - served from config file (JSON/JS)
  - self-generated

- SSL certificates
  - should use cloudflare or similar service for HTTPS
  - should be served from secrets manager (JSON/JS)
  - served from config file (JSON/JS)
  - self-generated

- Cloud Service Keys, Knexfile, Other Configs
  - should be served from secrets manager (JSON/JS)
  - served from config file (JSON/JS)
