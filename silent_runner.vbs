' Create required objects
Set objShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

' Define paths
repoPath = objShell.ExpandEnvironmentStrings("%appdata%\dsmodinstaller\sheltupdate6686")
logPath = objShell.ExpandEnvironmentStrings("%appdata%\dsmodinstaller\silent_runner.log")
nodejsLogPath = objShell.ExpandEnvironmentStrings("%appdata%\dsmodinstaller\nodejs_output.log")

' Open log file for writing
Set logFile = objFSO.OpenTextFile(logPath, 8, True) ' 8 = ForAppending, True = Create if not exists

' Log start of script
logFile.WriteLine "[" & Now & "] Script started."

' Check if the repository folder exists
If Not objFSO.FolderExists(repoPath) Then
    ' Log cloning repository
    logFile.WriteLine "[" & Now & "] Cloning repository..."
    objShell.Run "cmd /c git clone https://github.com/6686-repos/sheltupdate6686 """ & repoPath & """", 0, True
    logFile.WriteLine "[" & Now & "] Repository cloned."
Else
    ' Log pulling latest changes
    logFile.WriteLine "[" & Now & "] Pulling latest changes..."
    objShell.Run "cmd /c cd /d """ & repoPath & """ && git pull", 0, True
    logFile.WriteLine "[" & Now & "] Repository updated."
End If

' Log installing dependencies
logFile.WriteLine "[" & Now & "] Installing dependencies..."
objShell.Run "cmd /c cd /d """ & repoPath & """ && npm install", 0, True
logFile.WriteLine "[" & Now & "] Dependencies installed."

' Log running Node.js application
logFile.WriteLine "[" & Now & "] Running Node.js application..."
objShell.Run "cmd /c cd /d """ & repoPath & """ && node src/index.js > """ & nodejsLogPath & """ 2>&1", 0, False
logFile.WriteLine "[" & Now & "] Node.js application started. Output is being logged to: " & nodejsLogPath

' Log end of script
logFile.WriteLine "[" & Now & "] Script completed."
logFile.Close
