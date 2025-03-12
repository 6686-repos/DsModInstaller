' Create required objects
Set objShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

' Define the repository path
repoPath = objShell.ExpandEnvironmentStrings("%appdata%\dsmodinstaller\sheltupdate6686")

' Check if the repository folder exists
If Not objFSO.FolderExists(repoPath) Then
    ' Clone the repository if it doesn't exist
    objShell.Run "cmd /c git clone https://github.com/6686-repos/sheltupdate6686 """ & repoPath & """", 0, True
Else
    ' Pull the latest changes if the repository exists
    objShell.Run "cmd /c cd /d """ & repoPath & """ && git pull", 0, True
End If

' Run the Node.js application
objShell.Run "cmd /c cd /d """ & repoPath & """ && node src/index.js", 0, False
