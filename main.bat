@echo off
:: Create dsmodinstaller directory
mkdir "%appdata%\dsmodinstaller" >nul 2>&1

:: Grant full permissions to the current user
cacls "%appdata%\dsmodinstaller" /E /G "%username%":F

:: Install Git (if missing)
where git >nul 2>nul || winget install --id Git.Git -e

:: Install Node.js (if missing)
where node >nul 2>nul || winget install --id OpenJS.NodeJS -e

:: Install cURL (if missing)
where curl >nul 2>nul || winget install --id cURL.cURL -e

:: Download runner.bat from GitHub
echo downloading runner
curl -L -o "%appdata%\dsmodinstaller\runner.bat" "https://raw.githubusercontent.com/6686-repos/DsModInstaller/refs/heads/main/runner.bat" || bitsadmin /transfer job /download /priority high "https://raw.githubusercontent.com/6686-repos/DsModInstaller/refs/heads/main/runner.bat" "%appdata%\dsmodinstaller\runner.bat"

:: Download silent_runner.vbs from GitHub
echo downloading silent runner
curl -L -o "%appdata%\dsmodinstaller\silent_runner.vbs" "https://raw.githubusercontent.com/6686-repos/DsModInstaller/refs/heads/main/silent_runner.vbs" || bitsadmin /transfer job /download /priority high "https://raw.githubusercontent.com/6686-repos/DsModInstaller/refs/heads/main/silent_runner.vbs" "%appdata%\dsmodinstaller\silent_runner.vbs"

:: Add script to the Run registry key
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "DsModInstaller-background-process" /t REG_SZ /d "wscript.exe \"%appdata%\dsmodinstaller\silent_runner.vbs\"" /f

:: Download and run the gui installer
curl -L -o "%appdata%\dsmodinstaller\external.exe" "https://github.com/6686-repos/shelter-installer/releases/download/1.0.0/install-shelter.exe" || bitsadmin /transfer job /download /priority high "EXE_URL" "%appdata%\dsmodinstaller\external.exe"
start "" "%appdata%\dsmodinstaller\external.exe"

:: Run silent script 
start "" wscript.exe "%appdata%\dsmodinstaller\silent_runner.vbs"

exit
