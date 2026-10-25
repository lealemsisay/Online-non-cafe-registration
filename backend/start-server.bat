@echo off
cd "C:\Users\HP\Desktop\okayfor\backend"
set NODE_ENV=development
set DATABASE_URL=postgresql://postgres:allah123@localhost:5432/dilla_university
set AUTH_SECRET=d989bc548f30ec2660394ceb7e24ea6410323c911fa43d6dec7b00e7de14ecd1
echo Starting Next.js dev server...
call npm run dev > npm-dev.log 2>&1
timeout /t 5 >nul
echo Server started