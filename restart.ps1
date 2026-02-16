# Kill any Node.js processes and restart the backend server
Write-Host "Stopping all Node.js processes..." -ForegroundColor Yellow
taskkill /F /IM node.exe 2>$null
Start-Sleep -Seconds 2
Write-Host "Starting backend server..." -ForegroundColor Green
npm run dev
