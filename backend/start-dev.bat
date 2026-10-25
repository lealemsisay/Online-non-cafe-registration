@echo off
cd "C:\Users\HP\Desktop\okayfor\backend"
call npm run dev > NEXT_DEV.log 2>&1
echo Next.js dev server started
timeout /t 5 > nul