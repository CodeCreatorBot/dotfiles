if (Get-Command chezmoi -ErrorAction Ignore) {
    Set-Alias cz chezmoi
}

# Local secrets — colocated, never tracked by git or chezmoi.
# Create secrets.ps1 next to this file if you need it.
$secretsProfile = Join-Path $PSScriptRoot 'secrets.ps1'
if (Test-Path $secretsProfile) {
    . $secretsProfile
}

# posh-git — git prompt integration (install via: Install-Module -Name posh-git)
if (Get-Module -ListAvailable -Name posh-git) {
    Import-Module posh-git -ErrorAction Ignore
}

function Invoke-ProfileInit {
    param(
        [Parameter(Mandatory)]
        [string]$Command,
        [string[]]$ArgumentList = @()
    )

    if (Get-Command $Command -ErrorAction Ignore) {
        Invoke-Expression (& $Command @ArgumentList | Out-String)
    }
}
