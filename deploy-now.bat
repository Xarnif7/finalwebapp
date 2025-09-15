@echo off
echo Deploying fix for Router context issue...
git add -A
git commit -m "fix: ensure AuthProvider is inside Router context for useNavigate to work"
git push origin auth-final
echo Fix deployed! Site should be working now.
pause
