@echo off
echo Quick fix: reverting to old AuthProvider to fix white screen
git add -A
git commit -m "fix: revert to old AuthProvider to fix white screen deployment issue"
git push origin auth-final
echo Fix deployed! Site should work now.
