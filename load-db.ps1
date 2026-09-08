$env:PGPASSWORD = "1234"
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d job_portal -f "c:\Users\admin\Desktop\Job-portal-project\init-db.sql"
Write-Host "Database loaded successfully!"
