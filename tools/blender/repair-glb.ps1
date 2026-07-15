# repair-glb.ps1 - one-off: the first batch wrote JSON glTF (with .glb.bin
# buffer siblings) under a .glb name because the optimize output extension was
# ".opt". Repack every affected file into a true binary GLB and drop the .bin.
$ErrorActionPreference = 'Continue'
$repo = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
Set-Location $repo
$fixed = 0; $failed = @()

foreach ($glb in Get-ChildItem "public/assets/*.glb") {
    $magic = [System.Text.Encoding]::ASCII.GetString([System.IO.File]::ReadAllBytes($glb.FullName)[0..3])
    if ($magic -eq 'glTF') { continue } # already a real GLB
    $tmp = $glb.FullName -replace '\.glb$', '.fix.glb'
    & npx --yes @gltf-transform/cli copy $glb.FullName $tmp 2>$null | Out-Null
    $ok = ($LASTEXITCODE -eq 0) -and (Test-Path $tmp)
    if ($ok) {
        $m2 = [System.Text.Encoding]::ASCII.GetString([System.IO.File]::ReadAllBytes($tmp)[0..3])
        if ($m2 -eq 'glTF') {
            Move-Item -Force $tmp $glb.FullName
            $bin = "$($glb.FullName).bin"
            if (Test-Path $bin) { Remove-Item -Force $bin }
            $fixed++
            continue
        }
    }
    if (Test-Path $tmp) { Remove-Item -Force $tmp }
    $failed += $glb.Name
}
Write-Host "repaired: $fixed, failed: $($failed.Count) $($failed -join ', ')"
