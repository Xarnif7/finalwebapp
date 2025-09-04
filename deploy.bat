@echo off
echo Starting deployment process...
git add .
git commit -m "Force deployment - Send Requests functionality with email support"
git push origin auth-final
echo Deployment complete!
pause

