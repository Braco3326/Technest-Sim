# finish-asset.ps1 <id> <tris> [note] - post-Blender pipeline for ONE asset:
# gltf-transform Draco optimize (in-place, .opt.glb intermediate), manifest
# update, commit "asset: <id>", push. ASCII only (PS 5.1 codepage traps).
param(
    [Parameter(Mandatory = $true)][string]$Id,
    [Parameter(Mandatory = $true)][int]$Tris,
    [string]$Note = 'v2 (MCP live)'
)
$ErrorActionPreference = 'Continue'
$repo = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
Set-Location $repo
$glb = Join-Path $repo "public/assets/$Id.glb"
$png = Join-Path $repo "public/assets/thumbs/$Id.png"
$manifest = Join-Path $repo "public/assets/ASSET_MANIFEST.json"

if (-not (Test-Path $glb)) { Write-Host "FAIL $Id - glb missing"; exit 1 }

# optimize (output extension MUST be .glb for a binary container)
$opt = $glb -replace '\.glb$', '.opt.glb'
& npx --yes @gltf-transform/cli optimize $glb $opt --compress draco --texture-compress false 2>$null | Out-Null
$optimized = $false
if ($LASTEXITCODE -eq 0 -and (Test-Path $opt)) {
    $magic = [System.Text.Encoding]::ASCII.GetString([System.IO.File]::ReadAllBytes($opt)[0..3])
    if ($magic -eq 'glTF') { Move-Item -Force $opt $glb; $optimized = $true }
    else { Remove-Item -Force $opt }
} elseif (Test-Path $opt) { Remove-Item -Force $opt }

# manifest update via dedicated node script (no inline JS: PS 5.1 encoding traps)
node tools/blender/update-manifest.mjs $Id $Tris $Note

git add $glb $png $manifest
git commit -m "asset: $Id ($Note)" -m "Co-Authored-By: Claude Opus 4.8 (1M context) [noreply@anthropic.com]" 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) { git push 2>$null | Out-Null }
Write-Host "OK $Id - tris=$Tris optimized=$optimized committed"
