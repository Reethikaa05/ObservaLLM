# MongoDB Setup Guide for ObservaLLM

## Why MongoDB Instead of SQLite?

SQLite is file-based and uses native C++ modules that don't compile on Vercel's serverless environment. MongoDB is **serverless-ready**, **free** (Atlas free tier), and **perfect for Vercel**.

---

## 🚀 Setup MongoDB Atlas (Free Tier)

### Step 1: Create MongoDB Account
1. Go to [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas)
2. Click **"Try Free"**
3. Sign up with email or Google
4. Create organization and project

### Step 2: Create a Cluster
1. Click **"Create Deployment"**
2. Choose **"M0 Sandbox"** (free tier) ✅
3. Select **Cloud Provider**: AWS (or your choice)
4. Select **Region**: Pick closest to you (e.g., `us-east-1`)
5. **Cluster Name**: `observa-llm`
6. Click **"Create Deployment"**

**Takes 2-3 minutes to provision...**

### Step 3: Add Database User
1. Click **"Database Access"** in left menu
2. Click **"Add New Database User"**
3. **Username**: `observa_user`
4. **Password**: Generate strong password (copy it!)
5. **Built-in Role**: `readWriteAnyDatabase`
6. Click **"Add User"**

### Step 4: Allow Network Access
1. Click **"Network Access"** in left menu
2. Click **"Add IP Address"**
3. Click **"Allow Access from Anywhere"** (for development/testing)
4. For production, use specific IP or Vercel IPs: `76.223.*.*, 76.224.*.*`
5. Click **"Confirm"**

### Step 5: Get Connection String
1. Click **"Clusters"** 
2. Click **"Connect"** button on your cluster
3. Choose **"Drivers"** → **"Node.js"**
4. Copy the connection string
5. Replace `<password>` with your actual password from Step 3

**Example:**
```
mongodb+srv://observa_user:your_password_here@observa-llm.xxxxx.mongodb.net/observatory?retryWrites=true&w=majority
```

---

## 🔧 Configure Your App

### Local Development
1. Update `.env` in your project:
```bash
ANTHROPIC_API_KEY=sk-ant-your-key-here
MONGODB_URI=mongodb+srv://observa_user:password@observa-llm.xxxxx.mongodb.net/observatory?retryWrites=true&w=majority
```

2. Install dependencies:
```bash
cd backend
npm install
```

3. Seed the database:
```bash
npm run seed
```

4. Start backend:
```bash
npm run dev
```

### Vercel Deployment
1. Go to your Vercel project settings
2. Add environment variable `MONGODB_URI`:
   - Name: `MONGODB_URI`
   - Value: (paste your connection string from Step 5)
3. Click **"Save"**
4. Redeploy the project

**Vercel will auto-redeploy →** Your app connects to MongoDB!

---

## 📊 Verify Connection

### Check Data in MongoDB Atlas
1. Go to MongoDB Atlas Dashboard
2. Click **"Collections"** on your cluster
3. You should see 4 collections:
   - `conversations` (4 docs)
   - `messages` (6 docs)
   - `inference_logs` (5 docs)
   - `events` (4 docs)

### API Test
```bash
curl https://observa-llm.vercel.app/_/backend/api/conversations
```

Should return JSON with your seeded data!

---

## 🆓 MongoDB Free Tier Limits

- **Storage**: 512 MB (plenty for demo/testing)
- **Connections**: 500
- **Downtime**: 8 hours/month gracefully paused (won't lose data)
- **Upgradeable**: Anytime to paid plans

---

## Troubleshooting

### Connection Timeout
- Check MongoDB Atlas **Network Access** allows your IP
- Check connection string is correct (copy from Atlas dashboard)
- Verify password has no special characters that need URL encoding

### "MONGODB_URI not found"
- Add it to Vercel environment variables (not in .env)
- Redeploy after adding

### 0 Records Showing
- Run `npm run seed` locally to populate data
- Or let the app receive API calls (they'll be logged to DB)

---

## Migration from SQLite

All your SQLite schema has been converted to MongoDB collections:

| SQLite | MongoDB |
|--------|---------|
| Table: `conversations` | Collection: `conversations` |
| Table: `messages` | Collection: `messages` |
| Table: `inference_logs` | Collection: `inference_logs` |
| Table: `events` | Collection: `events` |

Your data structure is **exactly the same** - just backed by MongoDB now!

---

## Next Steps

1. ✅ Create MongoDB Atlas account & cluster
2. ✅ Add user and get connection string
3. ✅ Set `MONGODB_URI` in `.env` locally
4. ✅ Run `npm run seed`
5. ✅ Test locally with `npm run dev`
6. ✅ Deploy to Vercel with `MONGODB_URI` environment variable

**Your app is now serverless-ready!** 🚀
