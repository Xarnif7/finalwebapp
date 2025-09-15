@echo off
git add -A
git commit -m "fix: correct import paths to fix white screen deployment issue"
git push origin auth-final
echo Deployment fix pushed successfully!
