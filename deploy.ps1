Write-Host "Starting deployment process..."
git add .
git commit -m "Force deployment - Send Requests functionality with email support"
git push origin auth-final
Write-Host "Deployment complete!"

