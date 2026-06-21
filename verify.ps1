# CarbonIQ Verification Script

$ErrorActionPreference = 'Stop'

Write-Host '==================================================' -ForegroundColor 'Cyan'
Write-Host '             CarbonIQ Pre-flight Check             ' -ForegroundColor 'Cyan'
Write-Host '==================================================' -ForegroundColor 'Cyan'
Write-Host ''

$global:Passed = $true

function Print-Check {
    param (
        [string]$text,
        [bool]$success
    )
    if ($success) {
        Write-Host ('[PASS] ' + $text) -ForegroundColor 'Green'
    } else {
        Write-Host ('[FAIL] ' + $text) -ForegroundColor 'Red'
        $global:Passed = $false
    }
}

# 1. Check Git Repository
$isGit = Test-Path '.git'
Print-Check -text 'Git repository is initialized (.git directory found)' -success $isGit

# 2. Check Git Branch (Only 'main')
if ($isGit) {
    try {
        $branchName = (git branch --show-current).Trim()
        $isMain = ($branchName -eq 'main')
        Print-Check -text ('Current git branch is main (' + $branchName + ')') -success $isMain
        
        $localBranches = git branch
        $branchCount = ($localBranches | Measure-Object).Count
        Print-Check -text ('Exactly one local branch exists (' + $branchCount + ' found)') -success ($branchCount -eq 1)
    } catch {
        Print-Check -text 'Failed to run git branch checks' -success $false
    }
}

# 3. Check for Committed Node Modules or Environment Files
if ($isGit) {
    try {
        $trackedFiles = git ls-files
        
        $nodeModulesTracked = $trackedFiles | Where-Object { $_ -like '*node_modules*' }
        $noNodeModules = ($null -eq $nodeModulesTracked)
        Print-Check -text 'No node_modules files are tracked by Git' -success $noNodeModules
        if (-not $noNodeModules) {
            Write-Host '    Found tracked files under node_modules:' -ForegroundColor 'Yellow'
            $nodeModulesTracked | ForEach-Object { Write-Host ('      ' + $_) -ForegroundColor 'Yellow' }
        }

        $envTracked = $trackedFiles | Where-Object { $_ -like '*.env' }
        $noEnvTracked = ($null -eq $envTracked)
        Print-Check -text 'No local .env files are tracked by Git' -success $noEnvTracked
        if (-not $noEnvTracked) {
            Write-Host '    Found tracked .env files:' -ForegroundColor 'Yellow'
            $envTracked | ForEach-Object { Write-Host ('      ' + $_) -ForegroundColor 'Yellow' }
        }
    } catch {
        Print-Check -text 'Failed to run git file leak checks' -success $false
    }
}

# 4. Check Folder Size (Must be < 10 MB excluding node_modules and builds)
try {
    $excludePatterns = @('node_modules', 'dist', 'client/dist', '.git')
    
    $files = Get-ChildItem -Path . -Recurse -File -ErrorAction SilentlyContinue | Where-Object {
        $filePath = $_.FullName
        $exclude = $false
        foreach ($pattern in $excludePatterns) {
            if ($filePath -like ('*\' + $pattern + '\*')) {
                $exclude = $true
                break
            }
        }
        -not $exclude
    }
    
    $totalSize = ($files | Measure-Object -Property Length -Sum).Sum
    $sizeMB = [Math]::Round($totalSize / 1MB, 2)
    $sizeUnderLimit = ($sizeMB -lt 10.0)
    
    Print-Check -text ('Project submission size is ' + $sizeMB + ' MB (must be under 10.0 MB)') -success $sizeUnderLimit
} catch {
    Print-Check -text 'Failed to calculate folder size' -success $false
}

# 5. Check Tests Pass
Write-Host ''
Write-Host 'Running Backend Tests...' -ForegroundColor 'Cyan'
try {
    $proc = Start-Process -FilePath 'node' -ArgumentList 'server/engine/calculator.test.js' -NoNewWindow -PassThru -Wait
    $calcPass = ($proc.ExitCode -eq 0)
    
    $proc = Start-Process -FilePath 'node' -ArgumentList 'server/engine/comparator.test.js' -NoNewWindow -PassThru -Wait
    $compPass = ($proc.ExitCode -eq 0)

    $proc = Start-Process -FilePath 'node' -ArgumentList 'server/engine/explainer.test.js' -NoNewWindow -PassThru -Wait
    $expPass = ($proc.ExitCode -eq 0)

    $proc = Start-Process -FilePath 'node' -ArgumentList 'server/routes/routes.test.js' -NoNewWindow -PassThru -Wait
    $routesPass = ($proc.ExitCode -eq 0)

    $testsPassed = ($calcPass -and $compPass -and $expPass -and $routesPass)
    Print-Check -text 'All logical calculation engine and API route tests pass successfully' -success $testsPassed
} catch {
    Print-Check -text 'Failed to execute node unit tests' -success $false
}

# 6. Check UI Assets
$mockupExists = Test-Path 'docs/screenshots/carboniq_ui_mockup.png'
Print-Check -text 'UI Mockup screenshot resides in docs/screenshots/carboniq_ui_mockup.png' -success $mockupExists

Write-Host ''
Write-Host '==================================================' -ForegroundColor 'Cyan'
if ($global:Passed) {
    Write-Host '     VERIFICATION PASSED — READY FOR PUSH!        ' -ForegroundColor 'Green'
} else {
    Write-Host '     VERIFICATION FAILED — PLEASE CORRECT ERRORS  ' -ForegroundColor 'Red'
}
Write-Host '==================================================' -ForegroundColor 'Cyan'

if (-not $global:Passed) {
    exit 1
}
