# Deployment Guide

This guide covers deploying the YouTube Reply Service to various platforms.

## 📋 Pre-deployment Checklist

### Required Services
- [ ] MongoDB database (MongoDB Atlas recommended)
- [ ] Redis instance (for caching and sessions)
- [ ] SMTP email service (SendGrid, AWS SES, or Gmail)
- [ ] YouTube Data API credentials
- [ ] Stripe account with API keys
- [ ] Domain name and SSL certificate

### Environment Configuration
- [ ] All environment variables configured
- [ ] Database connection strings updated
- [ ] API keys and secrets secured
- [ ] CORS origins configured
- [ ] Email templates tested

## 🚀 Deployment Options

### Option 1: Digital Ocean Droplet

#### 1. Create Droplet
```bash
# Create Ubuntu 22.04 droplet with at least 2GB RAM
# Connect via SSH
ssh root@your-droplet-ip
```

#### 2. Install Dependencies
```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list
apt-get update
apt-get install -y mongodb-org

# Install Redis
apt install redis-server -y

# Install Nginx
apt install nginx -y

# Install PM2 for process management
npm install -g pm2
```

#### 3. Deploy Application
```bash
# Clone repository
git clone <your-repo-url> /var/www/youtube-reply-service
cd /var/www/youtube-reply-service

# Install dependencies
npm install
cd client && npm install && npm run build && cd ..

# Create production environment file
cp .env.example .env.production
nano .env.production

# Start services
systemctl start mongod
systemctl enable mongod
systemctl start redis-server
systemctl enable redis-server

# Start application with PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

#### 4. Configure Nginx
```nginx
# /etc/nginx/sites-available/youtube-reply-service
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### 5. Enable Site and SSL
```bash
# Enable site
ln -s /etc/nginx/sites-available/youtube-reply-service /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx

# Install Certbot for SSL
apt install certbot python3-certbot-nginx -y
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### Option 2: AWS EC2 with RDS

#### 1. Launch EC2 Instance
- AMI: Ubuntu 22.04 LTS
- Instance Type: t3.medium (2 vCPU, 4GB RAM)
- Security Group: Allow HTTP (80), HTTPS (443), SSH (22)

#### 2. Set up RDS
- Engine: MongoDB (DocumentDB)
- Instance class: db.t3.medium
- Storage: 20GB SSD

#### 3. Deploy Application
Follow similar steps as Digital Ocean, but use DocumentDB connection string:
```env
MONGODB_URI=mongodb://username:password@your-documentdb-cluster.cluster-xxx.us-east-1.docdb.amazonaws.com:27017/youtube-reply-service?ssl=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false
```

### Option 3: Docker Deployment

#### 1. Production Docker Compose
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    depends_on:
      - mongo
      - redis
    restart: always

  mongo:
    image: mongo:7
    volumes:
      - mongo_data:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_USERNAME}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
    restart: always

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: always

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.prod.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: always

volumes:
  mongo_data:
  redis_data:
```

#### 2. Deploy with Docker
```bash
# Build and start
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Update deployment
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build
```

### Option 4: Heroku Deployment

#### 1. Prepare for Heroku
```bash
# Install Heroku CLI
npm install -g heroku

# Login to Heroku
heroku login

# Create app
heroku create your-app-name

# Add MongoDB addon
heroku addons:create mongolab:sandbox

# Add Redis addon
heroku addons:create heroku-redis:hobby-dev
```

#### 2. Configure Environment Variables
```bash
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-jwt-secret
heroku config:set YOUTUBE_API_KEY=your-youtube-api-key
heroku config:set STRIPE_SECRET_KEY=your-stripe-secret
# ... add all required variables
```

#### 3. Deploy
```bash
# Add Procfile
echo "web: npm start" > Procfile

# Deploy
git add .
git commit -m "Deploy to Heroku"
git push heroku main

# Open app
heroku open
```

## 🔧 Production Configuration

### PM2 Ecosystem File
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'youtube-reply-service',
    script: 'server.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

### Nginx Production Configuration
```nginx
# nginx.prod.conf
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:5000;
    }

    server {
        listen 80;
        server_name _;

        client_max_body_size 10M;

        location / {
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location /api/webhooks/ {
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_buffering off;
        }
    }
}
```

## 📊 Monitoring and Logging

### Application Monitoring
```bash
# Install monitoring tools
npm install -g @pm2/io

# Monitor with PM2
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

### Log Management
```bash
# Create log directories
mkdir -p /var/log/youtube-reply-service

# Configure log rotation
cat > /etc/logrotate.d/youtube-reply-service << EOF
/var/log/youtube-reply-service/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 nodejs nodejs
    postrotate
        pm2 reloadLogs
    endscript
}
EOF
```

### Health Checks
```bash
# Add health check endpoint monitoring
curl -f http://localhost:5000/api/health || exit 1

# Set up uptime monitoring with external service
# - UptimeRobot
# - Pingdom
# - StatusCake
```

## 🔐 Security Hardening

### Server Security
```bash
# Configure firewall
ufw enable
ufw allow ssh
ufw allow http
ufw allow https

# Disable root login
nano /etc/ssh/sshd_config
# Set PermitRootLogin no

# Install fail2ban
apt install fail2ban -y

# Configure automatic security updates
apt install unattended-upgrades -y
dpkg-reconfigure -plow unattended-upgrades
```

### Application Security
```bash
# Set secure headers in Nginx
add_header X-Frame-Options DENY;
add_header X-Content-Type-Options nosniff;
add_header X-XSS-Protection "1; mode=block";
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

## 🔄 Backup and Recovery

### Database Backup
```bash
# Create backup script
cat > /home/backups/mongodb-backup.sh << EOF
#!/bin/bash
BACKUP_DIR="/home/backups/mongodb"
DATE=\$(date +%Y%m%d_%H%M%S)

mkdir -p \$BACKUP_DIR
mongodump --host localhost --port 27017 --out \$BACKUP_DIR/backup_\$DATE

# Compress and clean old backups
tar -czf \$BACKUP_DIR/backup_\$DATE.tar.gz \$BACKUP_DIR/backup_\$DATE
rm -rf \$BACKUP_DIR/backup_\$DATE
find \$BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete
EOF

chmod +x /home/backups/mongodb-backup.sh

# Schedule daily backups
crontab -e
# Add: 0 2 * * * /home/backups/mongodb-backup.sh
```

### Application Backup
```bash
# Backup application files
rsync -avz /var/www/youtube-reply-service/ /home/backups/app/

# Backup environment files
cp /var/www/youtube-reply-service/.env.production /home/backups/env/
```

## 📈 Scaling Considerations

### Horizontal Scaling
- Use load balancer (AWS ALB, Nginx)
- Deploy multiple application instances
- Implement session store with Redis
- Use CDN for static assets

### Database Scaling
- MongoDB replica sets
- Read replicas for analytics
- Database sharding for large datasets
- Connection pooling optimization

### Performance Optimization
- Enable gzip compression
- Implement caching strategy
- Optimize database queries
- Use CDN for static assets
- Enable HTTP/2

## 🚨 Troubleshooting

### Common Issues

#### Application Won't Start
```bash
# Check logs
pm2 logs
pm2 monit

# Check environment variables
pm2 env 0

# Check port availability
netstat -tulpn | grep :5000
```

#### Database Connection Issues
```bash
# Test MongoDB connection
mongo --host localhost --port 27017

# Check MongoDB logs
tail -f /var/log/mongodb/mongod.log

# Verify connection string
node -e "console.log(process.env.MONGODB_URI)"
```

#### SSL Certificate Issues
```bash
# Check certificate status
certbot certificates

# Renew certificates
certbot renew --dry-run

# Test SSL configuration
openssl s_client -connect yourdomain.com:443
```

### Recovery Procedures

#### Database Recovery
```bash
# Restore from backup
mongorestore --host localhost --port 27017 /path/to/backup
```

#### Application Recovery
```bash
# Rollback to previous version
git checkout previous-stable-commit
npm install
npm run build
pm2 restart all
```

---

For additional support, contact: Ali Sohel at avesohel@gmail.com