# FlyHigh 2.0 — Stop all local dev services
Get-Job -Name "flyhigh-signaling", "flyhigh-backend", "flyhigh-ui" -ErrorAction SilentlyContinue | Stop-Job
Get-Job -Name "flyhigh-signaling", "flyhigh-backend", "flyhigh-ui" -ErrorAction SilentlyContinue | Remove-Job
Write-Host "All FlyHigh services stopped." -ForegroundColor Yellow
