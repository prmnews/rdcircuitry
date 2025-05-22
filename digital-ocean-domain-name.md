# Domain Name and SSL Configuration for DigitalOcean

This guide provides step-by-step instructions for setting up a domain name with SSL certificates for your RD Circuitry application on DigitalOcean.

## Prerequisites

- Running DigitalOcean droplet with Docker containers
- Registered domain name (from any domain registrar)
- Access to domain's DNS settings

## 1. Point Domain to DigitalOcean Droplet

### Option A: Using DigitalOcean's DNS

1. Add domain to DigitalOcean:
   - Go to Networking → Domains
   - Click "Add Domain"
   - Enter your domain name and select your project
   - Click "Add Domain"

2. Add DNS records:
   - Create an A record pointing to your droplet:
     - Enter `@` in the Hostname field
     - Select your droplet IP from the dropdown
     - Click "Create Record"
   - Create another A record for the www subdomain:
     - Enter `www` in the Hostname field
     - Select your droplet IP from the dropdown
     - Click "Create Record"

3. Update your domain's nameservers at your registrar:
   - Set nameservers to:
     - ns1.digitalocean.com
     - ns2.digitalocean.com
     - ns3.digitalocean.com

### Option B: Using Existing DNS Provider

1. Create A records at your domain registrar's DNS settings:
   - Create an A record pointing `@` to your droplet IP
   - Create an A record pointing `www` to your droplet IP

2. Wait for DNS propagation (can take up to 48 hours, but often much faster)

## 2. Install and Configure Nginx

```bash
# Install Nginx
apt update
apt install nginx -y

# Allow Nginx through firewall
ufw allow 'Nginx Full'
ufw status
```

## 3. Create Nginx Configuration

```bash
# Create a new configuration file
nano /etc/nginx/sites-available/rdcircuitry
```

Add the following configuration (replace `yourdomain.com` with your actual domain):

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    location /api {
        proxy_pass http://localhost:4000/api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    location /socket.io {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 4. Enable the Site Configuration

```bash
# Create a symbolic link to enable the site
ln -s /etc/nginx/sites-available/rdcircuitry /etc/nginx/sites-enabled/

# Test the Nginx configuration
nginx -t

# If test is successful, restart Nginx
systemctl restart nginx
```

## 5. Install SSL Certificate with Let's Encrypt

```bash
# Install Certbot
apt install certbot python3-certbot-nginx -y

# Obtain and install SSL certificate
certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Follow the prompts to complete the process
# Choose to redirect HTTP to HTTPS when asked
```

## 6. Update Application Environment Variables

After setting up the domain, update your application's environment files to use your domain:

### Update frontend environment file:

```bash
nano /opt/rdcircuitry/frontend/.env.local
```

Change the environment variables to use your domain:
```
NEXT_PUBLIC_API_URL=https://yourdomain.com/api
NEXT_PUBLIC_SOCKET_URL=https://yourdomain.com
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your-nextauth-secret
```

### Update backend environment file:

```bash
nano /opt/rdcircuitry/backend/.env
```

Update the FRONTEND_URL:
```
FRONTEND_URL=https://yourdomain.com
```

## 7. Restart Containers

```bash
# Navigate to your application directory
cd /opt/rdcircuitry

# Restart the containers
docker-compose down
docker-compose up -d
```

## 8. Verify the Setup

1. Open your browser and visit your domain with HTTPS:
   ```
   https://yourdomain.com
   ```

2. Test the API endpoint:
   ```
   https://yourdomain.com/api/health
   ```

3. Check Nginx logs if needed:
   ```bash
   tail -f /var/log/nginx/access.log
   tail -f /var/log/nginx/error.log
   ```

## 9. Automatic SSL Renewal

Let's Encrypt certificates expire after 90 days. Certbot installs a timer service that automatically renews certificates before they expire.

Verify the timer is active:
```bash
systemctl status certbot.timer
```

## 10. Troubleshooting

### Nginx Configuration Issues
```bash
# Test Nginx configuration
nginx -t

# Check Nginx status
systemctl status nginx
```

### SSL Certificate Issues
```bash
# Check Certbot logs
journalctl -u certbot

# Manually renew certificates
certbot renew --dry-run
```

### Proxy Issues
```bash
# Verify the containers are running
docker-compose ps

# Check if the app is accessible locally
curl http://localhost:3000
curl http://localhost:4000/api/health
```

### DNS Issues
```bash
# Install dig tool
apt install dnsutils -y

# Check DNS resolution
dig yourdomain.com
dig www.yourdomain.com
```

### Common Fixes
```bash
# Restart Nginx
systemctl restart nginx

# Restart Docker containers
cd /opt/rdcircuitry
docker-compose restart
``` 