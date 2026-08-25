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
        booleanParam(name: 'PUBLISH_RELEASE', defaultValue: false, description: 'Deprecated: publishing now happens on the GitLab side after this build succeeds')
        // Supplied by the GitLab bridge from a masked CI variable. A password
        // parameter rather than a Jenkins credential because adding credentials
        // to the system store needs a permission we do not have here; Jenkins
        // masks password parameters in the console and the build UI.
        //
        // This one is low-value by construction: read_package_registry only, and
        // it ships inside every installer anyway, so the exposure is the same
        // population that could extract it from the app.
        password(name: 'GITLAB_UPDATE_TOKEN', defaultValue: '', description: 'GitLab deploy token baked into the installer as its update feed')
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

        stage('Python environment') {
            steps {
                powershell '''
                    $ErrorActionPreference = "Stop"
                    # Build-local virtualenv. Nothing is ever installed into the
                    # machine-wide Python: the QA automation jobs on this agent share
                    # C:\\Python313, and a dependency change or pip upgrade from this
                    # build could break them. Every later stage prepends the same path.
                    python -m venv .venv
                    $env:PATH = "$PWD\\.venv\\Scripts;$env:PATH"
                    python -m pip install --upgrade pip
                    Write-Host "Using interpreter: $((Get-Command python).Source)"
                '''
            }
        }

        stage('Toolchain information') {
            steps {
                powershell '''
                    $env:PATH = "$PWD\\.venv\\Scripts;$env:PATH"
                    python --version; node --version; npm --version
                '''
            }
        }

        stage('Python unit tests') {
            steps {
                powershell '''
                    $ErrorActionPreference = "Stop"
                    $env:PATH = "$PWD\\.venv\\Scripts;$env:PATH"
                    python -m pip install -e ".[test]"
                    python -m pytest tests/unit -q
                '''
            }
        }

        stage('Frontend smoke tests') {
            steps {
                powershell '''
                    $ErrorActionPreference = "Stop"
                    $env:PATH = "$PWD\\.venv\\Scripts;$env:PATH"
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
                // The installer carries the GitLab feed it will later update from.
                // Read-only, package-registry-scoped; the app falls back to the
                // GitHub feed baked into app-update.yml when GitLab does not answer.
                withEnv(["GITLAB_UPDATE_TOKEN=${params.GITLAB_UPDATE_TOKEN}"]) {
                powershell '''
                    $ErrorActionPreference = "Stop"
                    $env:PATH = "$PWD\\.venv\\Scripts;$env:PATH"
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
                    # Jenkins loads the Jenkinsfile from the default branch but
                    # checks out the source at the requested ref, so rebuilding a
                    # tag from before the update feed existed would otherwise die
                    # on two npm scripts that are not in its package.json. Skip
                    # them for that source and keep the tag rebuildable; anything
                    # from v2.3.0 on always has them.
                    if (Test-Path scripts/write-update-feed.mjs) {
                        npm run test:update-feed
                        if ($LASTEXITCODE -ne 0) { throw "update-feed tests failed" }
                    } else {
                        Write-Host "No update feed in this source revision - skipping feed steps."
                    }
                    npm run test:e2e:smoke
                    npm run test:e2e:full
                    if (Test-Path scripts/write-update-feed.mjs) {
                        npm run update-feed
                        if ($LASTEXITCODE -ne 0) { throw "update-feed generation failed" }
                    }
                    npx electron-builder --win --x64 --publish never
                    $env:PACKAGED_APP_PATH = Join-Path $env:WORKSPACE 'electron-app\\dist-electron\\win-unpacked\\MDES XML Studio.exe'
                    npm run test:e2e:packaged
                '''
                }
            }
        }

    }

    post {
        always {
            script {
                // Only release builds produce installer artifacts. Archiving
                // unconditionally makes Jenkins print "No artifacts found...
                // Configuration error?" on every normal build, which trains
                // people to ignore the warnings that do matter.
                if (params.QUALIFY_TAG || params.PUBLISH_RELEASE) {
                    archiveArtifacts artifacts: 'electron-app/dist-electron/*.exe,electron-app/dist-electron/*.blockmap,electron-app/dist-electron/latest.yml', allowEmptyArchive: true
                }
            }
        }
    }
}
