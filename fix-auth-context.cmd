@echo off
echo Fixing AuthProvider context issue...
git add -A
git commit -m "fix: move AuthProvider to App.jsx to fix useAuth context error"
git push origin auth-final
echo Auth context fix deployed!
