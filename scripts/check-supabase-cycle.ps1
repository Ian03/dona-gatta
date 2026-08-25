param(
    [string]$ProjectRef = "qrfgtkbwykkcfroybcro"
)

$ErrorActionPreference = "Stop"

$token = $env:SUPABASE_ACCESS_TOKEN
if ([string]::IsNullOrWhiteSpace($token)) {
    $secureToken = Read-Host "Supabase access token" -AsSecureString
    $token = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken)
    )
}

$headers = @{ Authorization = "Bearer $token" }

function Get-SupabaseApi($path) {
    Invoke-RestMethod -Method Get -Uri "https://api.supabase.com$path" -Headers $headers
}

$project = Get-SupabaseApi "/v1/projects/$ProjectRef"
$organizations = Get-SupabaseApi "/v1/organizations"
$organization = Get-SupabaseApi "/v1/organizations/$($project.organization_slug)"

[pscustomobject]@{
    Project = $project
    Organizations = $organizations
    Organization = $organization
} | ConvertTo-Json -Depth 30
