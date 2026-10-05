$ErrorActionPreference = "Stop"

$directoryUrl = "https://apps.education-ni.gov.uk/appinstitutes/default.aspx"
$postcodeApiUrl = "https://api.postcodes.io/postcodes"
$outputPath = Join-Path $PSScriptRoot "..\data\schools.json"

$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$page = Invoke-WebRequest -Uri $directoryUrl -WebSession $session -UseBasicParsing
$html = [string]$page.Content
$form = @{}

foreach ($match in [regex]::Matches(
    $html,
    '<input\b[^>]*type="hidden"[^>]*>',
    [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
)) {
    $tag = $match.Value
    $name = [regex]::Match($tag, 'name="([^"]+)"').Groups[1].Value
    $value = [regex]::Match($tag, 'value="([^"]*)"').Groups[1].Value
    if ($name) {
        $form[$name] = [System.Net.WebUtility]::HtmlDecode($value)
    }
}

$form['__EVENTTARGET'] = 'ctl00$ContentPlaceHolder1$lvSchools$btnDoExport'
$form['__EVENTARGUMENT'] = ""
$form['ctl00$ContentPlaceHolder1$lvSchools$exportType'] = "2"

$filename = [regex]::Match(
    $html,
    'name="ctl00\$ContentPlaceHolder1\$lvSchools\$exportFilename\$exportFilename"[^>]*value="([^"]*)"'
).Groups[1].Value
if ($filename) {
    $form['ctl00$ContentPlaceHolder1$lvSchools$exportFilename$exportFilename_hfv'] =
        [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($filename))
}

$export = Invoke-WebRequest -Uri $directoryUrl -Method Post -Body $form -WebSession $session -UseBasicParsing
if ($export.Headers["Content-Disposition"] -notmatch '\.csv') {
    throw "The Department of Education directory did not return a CSV export."
}

if ($export.Content -is [byte[]]) {
    $csv = [Text.Encoding]::UTF8.GetString($export.Content)
} else {
    $csv = [string]$export.Content
}

$rows = @(ConvertFrom-Csv -InputObject $csv)
if (-not $rows.Count -or -not ($rows[0].PSObject.Properties.Name -contains "Institution Reference Number")) {
    throw "The school directory export has an unexpected format."
}

$schools = @($rows | Where-Object {
    $_.Status.Trim() -eq "Open" -and $_.Type.Trim() -in @("Primary", "Secondary", "Grammar", "Independent", "Preps")
})
if (-not $schools.Count) {
    throw "No open primary or post-primary schools were found in the directory export."
}

$postcodes = @(
    $schools |
        ForEach-Object { ($_.Postcode.Trim() -replace "\s+", " ").ToUpperInvariant() -replace "O", "0" } |
        Where-Object { $_ } |
        Sort-Object -Unique
)
$coordinates = @{}

for ($start = 0; $start -lt $postcodes.Count; $start += 100) {
    $end = [Math]::Min($start + 99, $postcodes.Count - 1)
    $batch = @($postcodes[$start..$end])
    $payload = ConvertTo-Json -InputObject @{ postcodes = $batch } -Compress
    $result = Invoke-RestMethod -Uri $postcodeApiUrl -Method Post -ContentType "application/json" -Body $payload
    foreach ($item in $result.result) {
        if ($item.result) {
            $coordinates[$item.query.ToUpperInvariant()] = $item.result
        }
    }
}

$openStreetMapFallbacks = @{
    "101-6604" = @{ latitude = 54.6148942; longitude = -5.9823348; area = "Belfast"; source = "OpenStreetMap school point" }
    "203-6186" = @{ latitude = 54.5139774; longitude = -7.4555308; area = "Fermanagh and Omagh"; source = "OpenStreetMap school point" }
    "523-0213" = @{ latitude = 54.4442637; longitude = -6.3624946; area = "Armagh City, Banbridge and Craigavon"; source = "OpenStreetMap postcode point" }
}

$records = foreach ($row in $schools) {
    $id = $row.'Institution Reference Number'.Trim()
    $postcode = $row.Postcode.Trim() -replace "\s+", " "
    $lookupPostcode = $postcode.ToUpperInvariant() -replace "O", "0"
    $location = $coordinates[$lookupPostcode]
    $locationSource = "Postcodes.io postcode centre"
    $area = if ($location) { $location.admin_district } else { $null }

    if (-not $location -and $openStreetMapFallbacks.ContainsKey($id)) {
        $location = $openStreetMapFallbacks[$id]
        $locationSource = $location.source
        $area = $location.area
    }
    if (-not $location) {
        throw "No coordinates found for $id ($($row.'Institution Name')) at $postcode."
    }

    $address = @(
        $row.'Address Line 1'
        $row.'Address Line 2'
        $row.'Address Line 3'
    ) | ForEach-Object { $_.Trim() } | Where-Object { $_ }

    [pscustomobject]@{
        id = $id
        name = $row.'Institution Name'.Trim()
        address = $address -join ", "
        town = $row.Town.Trim()
        county = $row.County.Trim()
        postcode = $postcode
        geocodePostcode = $lookupPostcode
        phase = switch ($row.Type.Trim()) {
            "Primary" { "Primary" }
            { $_ -in @("Secondary", "Grammar") } { "Post-primary" }
            default { "Independent / preparatory" }
        }
        schoolType = $row.Type.Trim()
        managementType = $row.Management.Trim()
        area = $area
        latitude = [Math]::Round([double]$location.latitude, 6)
        longitude = [Math]::Round([double]$location.longitude, 6)
        locationSource = $locationSource
        websiteUrl = $null
    }
}

$uniqueIds = @($records | Select-Object -ExpandProperty id -Unique)
if ($uniqueIds.Count -ne $records.Count) {
    throw "Duplicate Department of Education reference numbers found."
}

$data = [ordered]@{
    snapshotDate = (Get-Date -Format "yyyy-MM-dd")
    source = "Department of Education Northern Ireland Schools+ Institution Search"
    sourceUrl = $directoryUrl
    locationMethod = "Approximate postcode centres; source noted per school"
    schools = @($records | Sort-Object name)
}

$json = ConvertTo-Json -InputObject $data -Depth 5 -Compress
$fullOutputPath = [IO.Path]::GetFullPath($outputPath)
[IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($fullOutputPath)) | Out-Null
[IO.File]::WriteAllText($fullOutputPath, $json, [Text.UTF8Encoding]::new($false))

Write-Host "Wrote $($records.Count) open schools to $fullOutputPath"
