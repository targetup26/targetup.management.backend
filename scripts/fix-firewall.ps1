# Allow inbound traffic on port 5173 (Frontend)
New-NetFirewallRule -DisplayName "Allow React Frontend" -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow
Write-Host "✅ Firewall rule added for port 5173" -ForegroundColor Green

# Allow inbound traffic on port 3001 (Backend)
New-NetFirewallRule -DisplayName "Allow Node Backend" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow
Write-Host "✅ Firewall rule added for port 3001" -ForegroundColor Green
