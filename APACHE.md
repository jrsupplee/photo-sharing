# Deploying on Apache

Apache acts as a reverse proxy in front of a Node.js process running the Next.js app.

## Prerequisites

- Node.js 18+
- Apache 2.4+ with `mod_proxy`, `mod_proxy_http`, and `mod_rewrite` enabled
- (Optional) `mod_ssl` for HTTPS

```bash
sudo a2enmod proxy proxy_http rewrite headers
sudo systemctl restart apache2
```

## 1. Build the app

```bash
npm ci
npm run build
```

## 2. Configure environment variables

Create `/etc/photo-sharing.env` (or a `.env.local` in the project root):

```env
NODE_ENV=production
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=<random-secret>

# Database (choose one backend)
DB_BACKEND=sqlite
DATABASE_PATH=/var/lib/photo-sharing/wedding.db

# DB_BACKEND=mysql
# DB_HOST=localhost
# DB_PORT=3306
# DB_USER=photo
# DB_PASSWORD=secret
# DB_NAME=photosharing

# DB_BACKEND=postgres
# DB_HOST=localhost
# DB_PORT=5432
# DB_USER=photo
# DB_PASSWORD=secret
# DB_NAME=photosharing

# Storage
UPLOAD_DIR=/var/lib/photo-sharing/uploads

# Seed admin on first run
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=changeme
```

Create required directories and set permissions:

```bash
sudo mkdir -p /var/lib/photo-sharing/uploads
sudo chown -R www-data:www-data /var/lib/photo-sharing
```

## 3. Run the app

The app listens on `http://localhost:3000` by default. To change the port, set `PORT=XXXX` in the environment file and update the Apache config below.

Choose either **pm2** (recommended) or **systemd**.

### Option A — pm2

Install `pm2` globally:

```bash
sudo npm install -g pm2
```

Create `ecosystem.config.js` in the project root:

```js
module.exports = {
  apps: [
    {
      name: "photo-sharing",
      script: "node",
      args: "server.js",
      cwd: "/path/to/photo-sharing",
      env_file: "/etc/photo-sharing.env",
      user: "www-data",
      autorestart: true,
      restart_delay: 5000,
      out_file: "/var/log/photo-sharing/out.log",
      error_file: "/var/log/photo-sharing/error.log",
      merge_logs: true,
    },
  ],
};
```

```bash
sudo mkdir -p /var/log/photo-sharing
sudo chown www-data:www-data /var/log/photo-sharing

# Start and save the process list
sudo -u www-data pm2 start ecosystem.config.js
sudo -u www-data pm2 save

# Generate and enable a systemd unit so pm2 starts on boot
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u www-data --hp /var/lib/www-data
sudo systemctl enable pm2-www-data
```

Common `pm2` commands:

```bash
sudo -u www-data pm2 status              # show running processes
sudo -u www-data pm2 logs photo-sharing  # tail logs
sudo -u www-data pm2 restart photo-sharing
sudo -u www-data pm2 stop photo-sharing
```

### Option B — systemd

Create `/etc/systemd/system/photo-sharing.service`:

```ini
[Unit]
Description=Photo Sharing (Next.js)
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/photo-sharing
EnvironmentFile=/etc/photo-sharing.env
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now photo-sharing
sudo systemctl status photo-sharing
```

## 4. Apache virtual host

Create `/etc/apache2/sites-available/photo-sharing.conf`:

```apache
<VirtualHost *:80>
    ServerName yourdomain.com

    # Redirect HTTP to HTTPS (remove this block if not using SSL)
    RewriteEngine On
    RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [R=301,L]
</VirtualHost>

<VirtualHost *:443>
    ServerName yourdomain.com

    # SSL — adjust paths to your certificates
    SSLEngine on
    SSLCertificateFile    /etc/ssl/certs/yourdomain.crt
    SSLCertificateKeyFile /etc/ssl/private/yourdomain.key

    # Preserve the original Host header for NextAuth
    ProxyPreserveHost On

    # Forward WebSocket upgrade headers (used by Next.js HMR in dev; harmless in prod)
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} websocket [NC]
    RewriteCond %{HTTP:Connection} upgrade [NC]
    RewriteRule ^/?(.*) ws://localhost:3000/$1 [P,L]

    # Proxy everything else to Next.js
    ProxyPass        / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/

    # Increase timeout for large file uploads / ZIP downloads
    ProxyTimeout 300

    # Increase max request body size for photo uploads (adjust as needed)
    LimitRequestBody 104857600

    ErrorLog  ${APACHE_LOG_DIR}/photo-sharing-error.log
    CustomLog ${APACHE_LOG_DIR}/photo-sharing-access.log combined
</VirtualHost>
```

Enable the site:

```bash
sudo a2ensite photo-sharing
sudo apachectl configtest
sudo systemctl reload apache2
```

## 5. Serving uploaded files

Uploaded files are served by the Next.js route `GET /api/files/[...path]`. No special Apache configuration is needed — the proxy handles these requests.

If you want Apache to serve static uploads directly (bypassing Node.js for better performance), point Apache at `UPLOAD_DIR` and exclude that path from proxying:

```apache
Alias /api/files /var/lib/photo-sharing/uploads

<Directory /var/lib/photo-sharing/uploads>
    Options -Indexes
    Require all granted
</Directory>

# Do NOT proxy /api/files — served directly above
ProxyPass        /api/files !
ProxyPass        / http://localhost:3000/
ProxyPassReverse / http://localhost:3000/
```

## 6. Deploying updates

```bash
git pull
npm ci
npm run build

# pm2
sudo -u www-data pm2 restart photo-sharing

# systemd
sudo systemctl restart photo-sharing
```
