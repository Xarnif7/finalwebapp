@echo off
echo Fixing Router context issue...
git add -A
git commit -m "fix: ensure AuthProvider is inside Router context for useNavigate to work"
git push origin auth-final
echo Router context fix deployed!
