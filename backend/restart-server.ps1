# Restart helper for the Dilla University backend (Next.js dev server).
# Kills the process listening on port 3000 and starts a new dev server.
$conn = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Where-Object { $_.State -eq 'Listen' } | Select-Object -First 1 -ExpandProperty OwningProcess
if ($conn) {
    Stop-Process -Id $conn -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 3
}
Start-Process cmd -ArgumentList '/c "cd /d C:\Users\HP\Desktop\okayfor\backend && npm run dev > C:\Users\HP\AppData\Local\Temp\opencode\backend-restart.log 2>&1"' -NoNewWindow
