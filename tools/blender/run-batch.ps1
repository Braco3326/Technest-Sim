# run-batch.ps1 - autonomous asset batch (CLI fallback for the Blender MCP).
# ASCII ONLY: PowerShell 5.1 reads BOM-less files as Windows-1252; multibyte
# punctuation corrupts parsing (0x94 byte = closing smart quote).
# For each connectorType then each device (a1->b1->c1->d1 order):
#   blender headless -> .glb + thumbnail -> gltf-transform optimize (skip on fail)
#   -> manifest update -> git commit "asset: <id>" (lock-retry) -> push -> next.
# Any error: log, SKIP, continue. Never blocks the batch.
$ErrorActionPreference = 'Continue'
$repo = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
Set-Location $repo
$blender = "C:\Program Files\Blender Foundation\Blender 5.1\blender.exe"
$manifestPath = Join-Path $repo "public/assets/ASSET_MANIFEST.json"
$runLog = Join-Path $repo "tools/blender/assets-run.log"
New-Item -ItemType Directory -Force (Join-Path $repo "public/assets/thumbs") | Out-Null

function Log($msg) {
    $line = "$(Get-Date -Format 'HH:mm:ss') $msg"
    Add-Content -Path $runLog -Value $line
    Write-Host $line
}

$catalog = Get-Content (Join-Path $repo "content/catalog.json") -Raw | ConvertFrom-Json

# Ordered work list: connector kit first, then devices by level priority.
$work = @()
foreach ($c in $catalog.connectorTypes) { $work += @{ kind = 'connector'; id = $c.id } }
foreach ($lvl in @('a1', 'b1', 'c1', 'd1')) {
    foreach ($d in $catalog.devices) {
        if ($d.levels -contains $lvl -and -not ($work | Where-Object { $_.id -eq $d.id })) {
            $work += @{ kind = 'device'; id = $d.id }
        }
    }
}

$manifest = @{ generated = (Get-Date -Format 'yyyy-MM-dd HH:mm'); assets = @() }
$failed = @()
Log "BATCH START - $($work.Count) assets (connector kit + devices)"

foreach ($item in $work) {
    $id = $item.id; $kind = $item.kind
    # Absolute paths: blender resolves relative render paths against its own cwd.
    $glb = Join-Path $repo "public/assets/$id.glb"
    $png = Join-Path $repo "public/assets/thumbs/$id.png"
    $entry = @{ id = $id; kind = $kind; tris = 0; ports = 0; status = 'pending'; optimized = $false }

    # 1) blender headless
    $out = & $blender --background --factory-startup --python (Join-Path $repo 'tools/blender/gen_asset.py') -- --kind $kind --id $id --catalog (Join-Path $repo 'content/catalog.json') --out $glb --thumb $png 2>&1 | Out-String
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path $glb)) {
        $entry.status = 'failed-generate'
        $failed += $id
        Log "SKIP $id - blender exit $LASTEXITCODE"
        $manifest.assets += $entry
        continue
    }
    if ($out -match 'STATS tris=(\d+) ports=(\d+)') {
        $entry.tris = [int]$Matches[1]; $entry.ports = [int]$Matches[2]
    }

    # 2) optimize (Draco). Failure is non-fatal: raw glb stays.
    $opt = "$glb.opt"
    & npx --yes @gltf-transform/cli optimize $glb $opt --compress draco --texture-compress false 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0 -and (Test-Path $opt)) {
        Move-Item -Force $opt $glb
        $entry.optimized = $true
    } else {
        if (Test-Path $opt) { Remove-Item -Force $opt }
        Log "WARN $id - gltf-transform failed, keeping raw glb"
    }

    $entry.status = 'ok'
    $manifest.assets += $entry
    $manifest | ConvertTo-Json -Depth 5 | Set-Content -Encoding utf8 $manifestPath

    # 3) commit (retry on index.lock contention with the main session) + push
    $committed = $false
    for ($try = 0; $try -lt 6; $try++) {
        git add $glb $png $manifestPath 2>$null
        git commit -m "asset: $id" -m "Co-Authored-By: Claude Opus 4.8 (1M context) [noreply@anthropic.com]" 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) { $committed = $true; break }
        Start-Sleep -Seconds 2
    }
    if ($committed) {
        git push 2>$null | Out-Null
        if ($LASTEXITCODE -ne 0) { Log "WARN $id - push failed (rides along with the next push)" }
    } else {
        Log "WARN $id - commit failed after retries (files stay on disk)"
    }
    Log "OK $id - tris=$($entry.tris) ports=$($entry.ports) optimized=$($entry.optimized)"
}

# Final summary
$okCount = ($manifest.assets | Where-Object { $_.status -eq 'ok' }).Count
$lines = @()
$lines += ""
$lines += "## $(Get-Date -Format 'yyyy-MM-dd HH:mm') - Run 2 : batch CLI headless (Blender 5.1)"
$lines += ""
$lines += "- $okCount/$($work.Count) assets generes (voir public/assets/ASSET_MANIFEST.json)"
if ($failed.Count) { $lines += "- Echecs: $($failed -join ', ')" } else { $lines += "- Echecs: aucun" }
$lines += "- Pipeline: blender --background + gen_asset.py -> gltf-transform draco -> vignette -> commit/push par asset"
Add-Content -Path (Join-Path $repo "ASSET_LOG.md") -Value ($lines -join "`r`n")
for ($try = 0; $try -lt 6; $try++) {
    git add (Join-Path $repo "ASSET_LOG.md") $manifestPath 2>$null
    git commit -m "assets: batch summary ($okCount/$($work.Count) ok)" -m "Co-Authored-By: Claude Opus 4.8 (1M context) [noreply@anthropic.com]" 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { git push 2>$null | Out-Null; break }
    Start-Sleep -Seconds 2
}
Log "BATCH END - $okCount/$($work.Count) ok"
