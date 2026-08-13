pipeline {
    agent any

    environment {
        SCM_CREDENTIALS_ID = 'mdes-xml-tooling-readonly'
        SCM_REPOSITORY_URL = 'https://gitlab.dcsc.com/mdes/xml-tooling.git'
    }

    options {
        disableConcurrentBuilds()
        buildDiscarder(logRotator(daysToKeepStr: '30', numToKeepStr: '30'))
        timestamps()
        timeout(time: 120, unit: 'MINUTES')
    }

    parameters {
        string(name: 'GIT_REF', defaultValue: 'main', description: 'Git ref requested by GitLab')
        string(name: 'SOURCE_COMMIT', defaultValue: '', description: 'Exact Git commit requested by GitLab')
        string(name: 'GIT_REPOSITORY', defaultValue: '', description: 'Repository URL for traceability')
        string(name: 'GITLAB_PROJECT_PATH', defaultValue: '', description: 'GitLab project path')
        string(name: 'GITLAB_PROJECT_ID', defaultValue: '', description: 'GitLab project ID')
        string(name: 'GITLAB_API_V4_URL', defaultValue: 'https://gitlab.dcsc.com/api/v4', description: 'GitLab API base URL')
        string(name: 'GITLAB_PIPELINE_ID', defaultValue: '', description: 'Originating GitLab pipeline ID')
        string(name: 'GITLAB_PIPELINE_URL', defaultValue: '', description: 'Originating GitLab pipeline URL')
        string(name: 'GITLAB_PIPELINE_SOURCE', defaultValue: '', description: 'Originating GitLab pipeline source')
        booleanParam(name: 'QUALIFY_TAG', defaultValue: false, description: 'Run tag/version qualification')
        booleanParam(name: 'PUBLISH_RELEASE', defaultValue: false, description: 'Publish the built release to GitLab Package Registry and Releases')
    }

    stages {
        stage('Checkout requested source') {
            steps {
                script {
                    def expectedRepository = env.SCM_REPOSITORY_URL.replaceFirst(/\.git$/, '')
                    def requestedRepository = (params.GIT_REPOSITORY ?: expectedRepository)
                        .replaceAll(/\/+$/, '')
                        .replaceFirst(/\.git$/, '')
                    if (requestedRepository != expectedRepository) {
                        error("Refusing credentialed checkout from unexpected repository: ${params.GIT_REPOSITORY}")
                    }
                }
                checkout([
                    $class: 'GitSCM',
                    branches: [[name: params.SOURCE_COMMIT ?: params.GIT_REF]],
                    userRemoteConfigs: [[
                        url: env.SCM_REPOSITORY_URL,
                        credentialsId: env.SCM_CREDENTIALS_ID
                    ]],
                    extensions: [[$class: 'CleanBeforeCheckout']]
                ])
                powershell '''
                    $ErrorActionPreference = "Stop"
                    $actual = (git rev-parse HEAD).Trim()
                    if ($env:SOURCE_COMMIT -and $actual -ne $env:SOURCE_COMMIT) {
                        throw "Jenkins checked out $actual but GitLab requested $env:SOURCE_COMMIT. Configure the SCM ref correctly."
                    }
                    Write-Host "Validated source commit: $actual"
                    Write-Host "GitLab pipeline: $env:GITLAB_PIPELINE_URL"
                '''
            }
        }

        stage('Toolchain information') {
            steps {
                powershell 'python --version; node --version; npm --version'
            }
        }

        stage('Python unit tests') {
            steps {
                powershell '''
                    $ErrorActionPreference = "Stop"
                    python -m pip install --upgrade pip
                    python -m pip install -e ".[test]"
                    python -m pytest tests/unit -q
                '''
            }
        }

        stage('Frontend smoke tests') {
            steps {
                powershell '''
                    $ErrorActionPreference = "Stop"
                    python -m pip install -r requirements.txt
                    Set-Location electron-app
                    npm ci
                    npm run build
                    npm run test:e2e:smoke
                '''
            }
        }

        stage('Tag release qualification') {
            when { expression { params.QUALIFY_TAG } }
            steps {
                powershell '''
                    $ErrorActionPreference = "Stop"
                    if (-not $env:GIT_REF.StartsWith('refs/tags/v')) { throw "Release qualification requires a vMAJOR.MINOR.PATCH tag." }
                    $tagVersion = $env:GIT_REF -replace '^refs/tags/v', ''
                    $packageVersion = (node -p "require('./electron-app/package.json').version").Trim()
                    $pythonVersion = (python -c "import crs_generator; print(crs_generator.__version__)").Trim()
                    if ($packageVersion -ne $tagVersion) { throw "Tag $tagVersion does not match Electron version $packageVersion" }
                    if ($pythonVersion -ne $tagVersion) { throw "Tag $tagVersion does not match Python version $pythonVersion" }
                    python -m pip install pytest -r requirements.txt -r requirements-build.txt
                    tests\\regression_test.ps1
                    python build_python_backend.py
                    Set-Location electron-app
                    npm ci
                    npm audit --omit=dev --audit-level=high
                    npm run build
                    npm run test:e2e:smoke
                    npm run test:e2e:full
                    npx electron-builder --win --x64 --publish never
                    $env:PACKAGED_APP_PATH = Join-Path $env:WORKSPACE 'electron-app\\dist-electron\\win-unpacked\\MDES XML Studio.exe'
                    npm run test:e2e:packaged
                '''
            }
        }

        stage('Publish GitLab release') {
            when { expression { params.PUBLISH_RELEASE } }
            steps {
                withCredentials([string(credentialsId: 'mdes-xml-studio-gitlab-release-token', variable: 'GITLAB_RELEASE_TOKEN')]) {
                    powershell '''
                        $ErrorActionPreference = "Stop"
                        if (-not $env:GITLAB_RELEASE_TOKEN) { throw 'The Jenkins GitLab release credential is not configured.' }
                        $tag = $env:GIT_REF -replace '^refs/tags/', ''
                        $version = $tag.TrimStart('v')
                        $base = "$env:GITLAB_API_V4_URL/projects/$env:GITLAB_PROJECT_ID"
                        $headers = @{ 'PRIVATE-TOKEN' = $env:GITLAB_RELEASE_TOKEN }
                        $packageBase = "$base/packages/generic/mdes-xml-studio/$version"
                        $files = @(
                            Get-ChildItem "$env:WORKSPACE\\electron-app\\dist-electron\\*.exe" -File
                            Get-ChildItem "$env:WORKSPACE\\electron-app\\dist-electron\\*.blockmap" -File
                            Get-Item "$env:WORKSPACE\\electron-app\\dist-electron\\latest.yml"
                        )
                        if ($files.Count -lt 3) { throw 'Expected installer, blockmap, and latest.yml release assets.' }
                        $links = foreach ($file in $files) {
                            $encodedName = [Uri]::EscapeDataString($file.Name)
                            $assetUrl = "$packageBase/$encodedName"
                            Invoke-RestMethod -Method Put -Uri $assetUrl -Headers $headers -InFile $file.FullName -ContentType 'application/octet-stream'
                            @{ name = $file.Name; url = $assetUrl; link_type = 'package' }
                        }
                        $releaseBase = "$base/releases"
                        $encodedTag = [Uri]::EscapeDataString($tag)
                        $description = "Automated Windows release for $tag. Existing installed clients continue to update from the matching GitHub release during the migration period."
                        $body = @{ name = "MDES XML Studio $tag"; tag_name = $tag; description = $description; assets = @{ links = @($links) } } | ConvertTo-Json -Depth 6
                        try {
                            Invoke-RestMethod -Method Put -Uri "$releaseBase/$encodedTag" -Headers $headers -ContentType 'application/json' -Body $body | Out-Null
                        }
                        catch {
                            if ([int]$_.Exception.Response.StatusCode -ne 404) { throw }
                            Invoke-RestMethod -Method Post -Uri $releaseBase -Headers $headers -ContentType 'application/json' -Body $body | Out-Null
                        }
                    '''
                }
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: 'electron-app/dist-electron/*.exe,electron-app/dist-electron/*.blockmap,electron-app/dist-electron/latest.yml', allowEmptyArchive: true
        }
    }
}
