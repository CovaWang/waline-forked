$ErrorActionPreference = "Stop"

# 无论从哪个目录调用脚本，都先进入 Waline 仓库
Set-Location $PSScriptRoot

# 改成你的真实 Hugo 目录
$hugoTarget = "E:\code_for_website\blog\static\waline-forked"

Write-Host "Building Waline client..." -ForegroundColor Cyan

pnpm --config.verify-deps-before-run=false `
  --filter "@waline/client" `
  build

if ($LASTEXITCODE -ne 0) {
    throw "Waline client build failed with exit code $LASTEXITCODE"
}

$walineJs = Join-Path $PSScriptRoot "packages\client\dist\waline.js"
$walineCss = Join-Path $PSScriptRoot "packages\client\dist\waline.css"

if (-not (Test-Path $walineJs)) {
    throw "Cannot find: $walineJs"
}

if (-not (Test-Path $walineCss)) {
    throw "Cannot find: $walineCss"
}

New-Item -ItemType Directory -Path $hugoTarget -Force | Out-Null

Copy-Item `
  -Path $walineJs `
  -Destination (Join-Path $hugoTarget "waline.js") `
  -Force

Copy-Item `
  -Path $walineCss `
  -Destination (Join-Path $hugoTarget "waline.css") `
  -Force

Write-Host "Waline assets synchronized successfully." -ForegroundColor Green
Write-Host "Target: $hugoTarget"