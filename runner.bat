@echo off
setlocal
set "repo_path=%appdata%\dsmodinstaller\sheltupdate6686"

:: Clone or pull repository
if not exist "%repo_path%" (
    git clone https://github.com/6686-repos/sheltupdate6686 "%repo_path%"
) else (
    cd /d "%repo_path%"
    git pull
)

:: Run Node.js app
cd /d "%repo_path%"
node src/index.js

endlocal
