@echo off
:: Download main.bat from GitHub
echo Downloading main.bat from GitHub...
curl -L -o "%temp%\main.bat" "https://raw.githubusercontent.com/6686-repos/DsModInstaller/refs/heads/main/main.bat" || bitsadmin /transfer job /download /priority high "https://raw.githubusercontent.com/6686-repos/DsModInstaller/refs/heads/main/main.bat" "%temp%\main.bat"

:: Run main.bat
echo Running main.bat...
call "%temp%\main.bat"
