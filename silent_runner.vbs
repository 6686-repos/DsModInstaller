Set objShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject") ' Create FileSystemObject
repoPath = objShell.ExpandEnvironmentStrings("%appdata%\dsmodinstaller\sheltupdate6686")

' Clone/pull repository
If Not objFSO.FolderExists(repoPath) Then
    objShell.Run "cmd /c git clone https://github.com/6686-repos/sheltupdate6686 """ & repoPath & """", 0, True
Else
    objShell.Run "cmd /c cd /d """ & repoPath & """ && git pull", 0, True
End If

' Run Node.js app
objShell.Run "cmd /c cd /d """ & repoPath & """ && node src/index.js", 0, False
