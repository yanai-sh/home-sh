$ErrorActionPreference = 'Stop'

if ($args.Count -lt 1) {
  Write-Error 'usage: scripts/wsl-run.ps1 <command...>'
}

$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
& node (Join-Path $Root 'scripts/ensure-sh-lf.mjs') | Out-Null

function Convert-ToWslPath([string]$Path) {
  if ($Path -match '^([A-Za-z]):\\(.*)$') {
    $drive = $Matches[1].ToLower()
    $rest = $Matches[2] -replace '\\', '/'
    return "/mnt/$drive/$rest"
  }
  return $Path -replace '\\', '/'
}

$WslRoot = Convert-ToWslPath $Root
$WslScript = "$WslRoot/scripts/wsl-run.sh"

$WslArgs = @()
if ($env:WSL_DISTRO_NAME) { $WslArgs += @('-d', $env:WSL_DISTRO_NAME) }
$WslArgs += @('bash', $WslScript)
$WslArgs += $args

& wsl @WslArgs
exit $LASTEXITCODE
