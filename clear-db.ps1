$env:PGPASSWORD = "1234"
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d job_portal -c "DELETE FROM applications; DELETE FROM jobs; SELECT count(*) FROM jobs;"
Write-Host "Database successfully cleared of synthetic records!"
