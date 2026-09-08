param(
    [int]$Port = 8080,
    [switch]$Force
)

$ErrorActionPreference = "Stop"

function Stop-ListenerOnPort {
    param(
        [int]$TargetPort,
        [switch]$KillAnyProcess
    )

    $listeners = Get-NetTCPConnection -LocalPort $TargetPort -State Listen -ErrorAction SilentlyContinue

    if (-not $listeners) {
        Write-Host "Port $TargetPort is free."
        return
    }

    foreach ($listener in $listeners) {
        $processId = $listener.OwningProcess
        $proc = Get-Process -Id $processId -ErrorAction SilentlyContinue

        if (-not $proc) {
            continue
        }

        $isJavaLike = @("java", "javaw", "mvn", "mvnw") -contains $proc.ProcessName.ToLowerInvariant()

        if ($isJavaLike -or $KillAnyProcess) {
            Write-Host "Stopping process '$($proc.ProcessName)' (PID $processId) on port $TargetPort..."
            Stop-Process -Id $processId -Force
        } else {
            Write-Error "Port $TargetPort is used by '$($proc.ProcessName)' (PID $processId). Re-run with -Force to stop it automatically."
        }
    }

    $stillListening = Get-NetTCPConnection -LocalPort $TargetPort -State Listen -ErrorAction SilentlyContinue
    if ($stillListening) {
        throw "Port $TargetPort is still in use after stop attempt."
    }

    Write-Host "Port $TargetPort has been released."
}

Stop-ListenerOnPort -TargetPort $Port -KillAnyProcess:$Force

# Load .env file into current process environment if present
$candidateFiles = @(
    "$PSScriptRoot\.env",
    "$PSScriptRoot\..\.env"
)
foreach ($envPath in $candidateFiles) {
    if (Test-Path $envPath) {
        Write-Host "Loading environment from $envPath..."
        Get-Content $envPath | ForEach-Object {
            $line = $_.Trim()
            if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
                $parts = $line.Split("=", 2)
                $key = $parts[0].Trim()
                $val = $parts[1].Trim().Trim('"').Trim("'")
                if (-not [System.Environment]::GetEnvironmentVariable($key, "Process")) {
                    [System.Environment]::SetEnvironmentVariable($key, $val, "Process")
                }
            }
        }
    }
}

Write-Host "Starting Spring Boot backend on port $Port..."
& "$PSScriptRoot\mvnw.cmd" -f "$PSScriptRoot\pom.xml" spring-boot:run
