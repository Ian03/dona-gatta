param(
    [string]$ProjectRef = "qrfgtkbwykkcfroybcro",
    [string]$OutputPath = "backups/supabase-public-data.json"
)

$ErrorActionPreference = "Stop"

$token = $env:SUPABASE_ACCESS_TOKEN
if ([string]::IsNullOrWhiteSpace($token)) {
    $secureToken = Read-Host "Supabase access token" -AsSecureString
    $token = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken)
    )
}

if ([string]::IsNullOrWhiteSpace($token)) {
    throw "Supabase access token is required."
}

$query = @"
select jsonb_build_object(
  'exported_at', now(),
  'project_ref', '$ProjectRef',
  'colecoes', coalesce((select jsonb_agg(to_jsonb(c) order by c.created_at desc) from public.colecoes c), '[]'::jsonb),
  'variacoes', coalesce((select jsonb_agg(to_jsonb(v) order by v.created_at asc) from public.variacoes v), '[]'::jsonb)
) as backup;
"@

$body = @{
    query = $query
    read_only = $true
} | ConvertTo-Json -Depth 8

$uri = "https://api.supabase.com/v1/projects/$ProjectRef/database/query"
$response = Invoke-RestMethod `
    -Method Post `
    -Uri $uri `
    -Headers @{ Authorization = "Bearer $token" } `
    -ContentType "application/json" `
    -Body $body

$outputDirectory = Split-Path -Parent $OutputPath
if ($outputDirectory -and !(Test-Path $outputDirectory)) {
    New-Item -ItemType Directory -Path $outputDirectory | Out-Null
}

$response | ConvertTo-Json -Depth 100 | Set-Content -Path $OutputPath -Encoding UTF8
Write-Host "Backup written to $OutputPath"
