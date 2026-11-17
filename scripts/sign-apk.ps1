param(
    [Parameter(Mandatory=$true)][string]$InputApk,
    [Parameter(Mandatory=$true)][string]$OutputApk,
    [string]$Java = 'java',
    [string]$SigningDirectory = '.tools/signing',
    [string]$ApkSig = '.tools/apksig.jar'
)
$ErrorActionPreference = 'Stop'
$securePassword = ConvertTo-SecureString (Get-Content (Join-Path $SigningDirectory 'password.dpapi') -Raw).Trim()
$env:PLANNER_KEY_PASSWORD = [Net.NetworkCredential]::new('', $securePassword).Password
try {
    & $Java -cp $ApkSig scripts/SignApk.java (Join-Path $SigningDirectory 'planner.p12') $InputApk $OutputApk
    if ($LASTEXITCODE -ne 0) { throw 'APK signing or verification failed' }
} finally { Remove-Item Env:PLANNER_KEY_PASSWORD }
Get-FileHash -LiteralPath $OutputApk -Algorithm SHA256
