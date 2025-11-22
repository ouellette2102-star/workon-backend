# 🗄️ Database Setup Guide

## ❌ Current Error

```
Error: P1000: Authentication failed against database server, 
the provided database credentials for `postgres` are not valid.
```

**This means:** PostgreSQL is running on port 5432, but the password `postgres:postgres` doesn't work.

---

## ✅ SOLUTION OPTIONS

### Option 1: Use Docker PostgreSQL (Recommended)

**Easiest and most reliable for development.**

#### Step 1: Stop existing PostgreSQL
```powershell
# Stop Windows PostgreSQL service
Stop-Service -Name postgresql-x64-* -Force
```

#### Step 2: Run PostgreSQL with Docker
```powershell
docker run --name workon-postgres `
  -e POSTGRES_PASSWORD=postgres `
  -e POSTGRES_DB=workon_dev `
  -p 5432:5432 `
  -d postgres:16-alpine
```

#### Step 3: Update backend/.env
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/workon_dev?schema=public
```

#### Step 4: Push schema
```powershell
cd backend
npx prisma db push
```

---

### Option 2: Use Supabase Local (Recommended for Production-like setup)

#### Step 1: Install Supabase CLI
```powershell
npm install -g supabase
```

#### Step 2: Start Supabase
```powershell
cd C:\Users\ouell\WorkOnApp
supabase start
```

#### Step 3: Update backend/.env
```env
# Supabase local uses port 54322
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres?schema=public
```

#### Step 4: Push schema
```powershell
cd backend
npx prisma db push
```

---

### Option 3: Fix Windows PostgreSQL Password

If you want to keep using the Windows PostgreSQL installation:

#### Step 1: Find PostgreSQL installation
```powershell
Get-Service -Name postgresql* | Select-Object Name, Status
```

#### Step 2: Reset postgres user password

**Option A: Via pgAdmin**
1. Open pgAdmin 4
2. Connect to localhost
3. Right-click on `postgres` user → Properties
4. Set password to `postgres`

**Option B: Via SQL (if you know the current password)**
```sql
ALTER USER postgres WITH PASSWORD 'postgres';
```

#### Step 3: Verify connection
```powershell
# Test connection (you'll need psql in PATH)
psql -U postgres -h localhost -d postgres -c "SELECT version();"
```

#### Step 4: Create database
```powershell
psql -U postgres -h localhost -c "CREATE DATABASE workon_dev;"
```

#### Step 5: Update backend/.env
```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/workon_dev?schema=public
```

---

### Option 4: Use Environment-Specific Password

If your PostgreSQL uses a different password:

#### Step 1: Find your password
- Check your PostgreSQL installation notes
- Look in pgAdmin connection settings
- Check Windows Credential Manager

#### Step 2: Update backend/.env
```env
DATABASE_URL=postgresql://postgres:YOUR_ACTUAL_PASSWORD@localhost:5432/workon_dev?schema=public
```

#### Step 3: Create database (if doesn't exist)
```powershell
# Replace YOUR_PASSWORD with actual password
$env:PGPASSWORD="YOUR_PASSWORD"
createdb -U postgres -h localhost workon_dev
```

#### Step 4: Push schema
```powershell
cd backend
npx prisma db push
```

---

## 🧪 TESTING THE CONNECTION

### Test 1: Check PostgreSQL is running
```powershell
Test-NetConnection -ComputerName localhost -Port 5432
# Should show: TcpTestSucceeded : True
```

### Test 2: Test Prisma connection
```powershell
cd backend
npx prisma db pull
# Should connect and show schema (or empty if new DB)
```

### Test 3: Push schema
```powershell
cd backend
npx prisma db push
# Should create all tables
```

### Test 4: Generate Prisma client
```powershell
cd backend
npx prisma generate
```

### Test 5: Start backend
```powershell
cd backend
npm run start:dev
# Should start without P1000 error
```

---

## 📝 CURRENT SETUP DETECTED

- PostgreSQL is running on: ✅ localhost:5432
- Supabase local: ❌ Not running (port 54322 closed)
- Current DATABASE_URL: `postgresql://postgres:postgres@localhost:5432/workon_dev`
- Error: P1000 - Invalid credentials

**Recommended Action:** Use Docker PostgreSQL (Option 1) for quickest setup.

---

## 🔧 QUICK FIX (Docker)

```powershell
# 1. Run PostgreSQL in Docker
docker run --name workon-postgres `
  -e POSTGRES_PASSWORD=postgres `
  -e POSTGRES_DB=workon_dev `
  -p 5432:5432 `
  -d postgres:16-alpine

# 2. Wait 5 seconds for startup
Start-Sleep -Seconds 5

# 3. Push schema
cd C:\Users\ouell\WorkOnApp\backend
npx prisma db push

# 4. Generate client
npx prisma generate

# 5. Start backend
npm run start:dev
```

**Done! Backend should start successfully.**

---

## ⚠️ COMMON ISSUES

### Issue 1: Port 5432 already in use
```
Error: bind: address already in use
```

**Solution:** Stop existing PostgreSQL
```powershell
# Stop Windows service
Stop-Service -Name postgresql-x64-* -Force

# Or stop Docker container
docker stop $(docker ps -q --filter "publish=5432")
```

### Issue 2: Docker not installed
```
docker: command not found
```

**Solution:** Install Docker Desktop for Windows
- Download: https://www.docker.com/products/docker-desktop
- Or use Option 2 (Supabase) or Option 3 (Fix Windows PostgreSQL)

### Issue 3: Database already exists but wrong schema
```
Error: P3006: Database schema is not empty
```

**Solution:** Drop and recreate
```powershell
# With Docker
docker exec workon-postgres psql -U postgres -c "DROP DATABASE workon_dev;"
docker exec workon-postgres psql -U postgres -c "CREATE DATABASE workon_dev;"

# Then push schema
cd backend
npx prisma db push
```

---

## ✅ VERIFICATION

After setup, verify everything works:

```powershell
# 1. Check database connection
cd backend
npx prisma db pull
# Should succeed

# 2. Check tables exist
npx prisma studio
# Opens GUI to view database

# 3. Start backend
npm run start:dev
# Should log: "Application is running on: http://localhost:3001/api/v1"
```

---

## 📚 ADDITIONAL RESOURCES

- Prisma Docs: https://www.prisma.io/docs/getting-started
- PostgreSQL Docker: https://hub.docker.com/_/postgres
- Supabase Local: https://supabase.com/docs/guides/cli/local-development

---

**Need help?** Check the error message carefully and follow the corresponding option above.

