@echo off
echo Emergency fix: removing AuthCTA/UserMenu to get site working
git add -A
git commit -m "emergency fix: remove AuthCTA/UserMenu to resolve useAuth context error"
git push origin auth-final
echo Emergency fix deployed! Site should load now.
