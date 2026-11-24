$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$status = git status --porcelain
if ($LASTEXITCODE -ne 0) { throw 'Unable to inspect Git working tree.' }
if ($status) { throw 'Upgrade stopped: commit or stash all local changes first.' }

$branch = git branch --show-current
if ($LASTEXITCODE -ne 0 -or -not $branch) { throw 'Upgrade stopped: unable to determine the current branch.' }

$upstreamUrl = git remote get-url upstream 2>$null
if ($LASTEXITCODE -ne 0) {
    git remote add upstream https://github.com/maillab/cloud-mail.git
    if ($LASTEXITCODE -ne 0) { throw 'Unable to configure the official Cloud Mail remote.' }
}

git fetch upstream main
if ($LASTEXITCODE -ne 0) { throw 'Unable to fetch the official Cloud Mail main branch.' }

git merge-base --is-ancestor upstream/main HEAD
if ($LASTEXITCODE -eq 0) {
    Write-Output 'This branch already contains the latest official Cloud Mail updates.'
    exit 0
}

git merge --no-commit --no-ff upstream/main
if ($LASTEXITCODE -ne 0) {
    git merge --abort
    throw 'Upgrade stopped because the upstream merge conflicted. The working tree was restored.'
}

try {
    pnpm --dir mail-vue run build
    if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed.' }

    git commit -m "Merge official Cloud Mail updates"
    if ($LASTEXITCODE -ne 0) { throw 'Unable to commit the verified upstream update.' }
} catch {
    git merge --abort
    throw
}

Write-Output "Official updates merged and verified on branch '$branch'. Deploy only after reviewing the diff."
