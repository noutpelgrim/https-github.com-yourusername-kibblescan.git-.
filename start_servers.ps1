$backendPath = ".\backend\server.js"
$frontendPath = ".\serve_frontend.js"

Write-Host "Starting Backend Server..."
Start-Process node -ArgumentList $backendPath -WorkingDirectory . -NoNewWindow

Write-Host "Starting Frontend Server..."
Start-Process node -ArgumentList $frontendPath -WorkingDirectory . -NoNewWindow

Write-Host "Servers launched in background."
