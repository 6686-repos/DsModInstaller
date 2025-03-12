@echo off
setlocal
set "repo_path=%appdata%\dsmodinstaller\sheltupdate6686"

:: Clone or pull repository
if not exist "%repo_path%" (
    echo Cloning repository...
    git clone https://github.com/6686-repos/sheltupdate6686 "%repo_path%"
) else (
    echo Pulling latest changes...
    cd /d "%repo_path%"
    git pull
)

:: Install dependencies and run Node.js app
cd /d "%repo_path%"
echo Installing dependencies...
npm install
echo Running Node.js application...
node src/index.js

endlocal
