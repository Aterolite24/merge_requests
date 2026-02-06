# Deployment Guide: merge_requests Platform

This guide provides step-by-step instructions for hosting the **merge_requests** platform on popular cloud services. The application consists of a FastAPI backend, a SQLite database, and a static frontend.

## 1. Hosting on Render (Recommended - Free Tier Available)
Render is ideal for this project as it supports Docker out of the box.

### **Steps:**
1. **Push to GitHub**: Ensure your project is pushed to a GitHub repository.
2. **Create New Web Service**:
   - Go to [dashboard.render.com](https://dashboard.render.com) and click **"New" > "Web Service"**.
   - Connect your GitHub repository.
3. **Configure Service**:
   - **Name**: `merge-requests-platform`
   - **Runtime**: Select **Docker**.
   - **Instance Type**: Select the **Free** tier.
4. **Environment Variables** (Optional):
   - Navigate to the "Environment" tab to add any custom API keys if needed in the future.
5. **Persistence (Crucial for SQLite)**:
   - Since SQLite stores data in a local file, it will be wiped on every redeploy unless you use a **Disk**.
   - Go to the **"Disks"** tab in Render.
   - Click **"Add Disk"**.
   - **Name**: `db-storage`
   - **Mount Path**: `/app/app/db`
   - **Size**: 1 GB.
6. **Deploy**: Render will build the image from the `Dockerfile` and go live.

---

## 2. Hosting on Railway (Fastest)
Railway is excellent for quick deployments and offers a generous trial.

### **Steps:**
1. **Push to GitHub**: Connect your repo.
2. **New Project**:
   - Go to [railway.app](https://railway.app) and click **"New Project"**.
   - Select **"Deploy from GitHub repo"**.
3. **Automatic Detection**: Railway will detect the `Dockerfile` and start the build automatically.
4. **Database Persistence**:
   - To keep your SQLite data across restarts, you need a Volume.
   - Click on your service > **"Settings"** > **"Volumes"**.
   - Mount a volume to `/app/app/db`.
5. **Public URL**: Railway provides a `railway.app` subdomain automatically.

---

## 3. Manual Deployment (VPS / Self-Hosting)
If you have a Linux server (DigitalOcean, AWS EC2, or a private server).

### **Steps:**
1. **Install Docker**: Ensure Docker and Docker Compose are installed.
2. **Clone & Build**:
   ```bash
   git clone <your-repo-url>
   cd merge_requests
   docker build -t merge_requests .
   ```
3. **Run Container**:
   ```bash
   docker run -d -p 80:8000 \
     -v $(pwd)/app/db:/app/app/db \
     --name merge_requests_app \
     merge_requests
   ```
   *Note: Using `-v` ensures your database file remains on the host machine even if the container stops.*

---

## 4. Post-Deployment Checklist
- **SSL**: Render and Railway handle SSL (HTTPS) automatically. For VPS, use Nginx with Certbot.
- **Port**: Ensure the server is listening on port `8000` (or mapped to `80/443`).
- **Health Check**: Visit `https://your-app.com/api/user/tourist` to verify API connectivity.

## 5. Scaling to Production
If your user base grows:
1. **Database**: Switch from SQLite to **PostgreSQL**. You can use [Supabase](https://supabase.com) or Render's Managed Postgres. Simply update `DATABASE_URL` in `app/db/models.py`.
2. **Static Assets**: For even faster performance, host the `static/` folder on a CDN like Vercel or Cloudflare Pages.
