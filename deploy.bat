@echo off
echo ==========================================
echo      KibbleScan Deployment Helper
echo ==========================================
echo.
echo [1/3] Adding files...
git add .

echo [2/3] Committing changes...
git commit -m "Production Deployment via Batch Script"

echo [3/3] Pushing to GitHub...
git push origin main

echo.
echo ==========================================
echo                DONE
echo ==========================================
echo.
pause
