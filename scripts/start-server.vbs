Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "C:\Users\Moustapha\mes-projets\immeit-hub"
WshShell.Run "node server.mjs", 0, False
