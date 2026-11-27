[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$root = Split-Path -Parent $PSScriptRoot
$scriptPath = Join-Path $root 'system/maintenance/checklists/content-backtest.ps1'
$tokens = $null; $parseErrors = $null
$ast = [Management.Automation.Language.Parser]::ParseFile($scriptPath, [ref]$tokens, [ref]$parseErrors)
if ($parseErrors.Count) { throw 'Backtest script must parse' }
$function = $ast.Find({param($node) $node -is [Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq 'Get-HistoricalBacktestRawPaths'}, $true)
if ($null -eq $function) { throw 'Historical source collector missing' }
# Load only the real collector; never execute maintenance or read a recipient corpus.
Invoke-Expression $function.Extent.Text
$fixture = Join-Path ([IO.Path]::GetTempPath()) ('knowledge-backtest-fixture-' + [Guid]::NewGuid().ToString('N'))
$projectRoot = $fixture
$runs = Join-Path $fixture 'system/maintenance/ingest-runs'
try {
    New-Item -ItemType Directory -Path $runs -Force | Out-Null
    $record = @{
        samples = @($null, @{note='auxiliary repair brief'}, @{source='raw-sources/receipt.md'}, @{source='private/ignored.md'})
        scoring_results = @(@{raw_path='raw-sources/scored.md'})
        source_content_audits = @(@{raw_path='raw-sources/audited.md'})
    }
    $record | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $runs 'content-backtest-fixture.json') -Encoding utf8
    $actual = @(Get-HistoricalBacktestRawPaths)
    $expected = @('raw-sources/audited.md','raw-sources/receipt.md','raw-sources/scored.md')
    if (($actual -join '|') -cne ($expected -join '|')) { throw "Unexpected source collection: $actual" }
    Write-Output 'PASS: null and auxiliary samples ignored; receipt, scoring and audit source paths retained'
} finally {
    $resolved = [IO.Path]::GetFullPath($fixture)
    if ((Split-Path -Parent $resolved) -cne ([IO.Path]::GetTempPath().TrimEnd('\')) -or -not (Split-Path -Leaf $resolved).StartsWith('knowledge-backtest-fixture-')) { throw 'Unsafe fixture cleanup' }
    if (Test-Path -LiteralPath $resolved) { Remove-Item -LiteralPath $resolved -Recurse -Force }
}
