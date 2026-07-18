; installer.iss — مثبّت FAHAD TV عبر Inno Setup
; يثبّت التطبيق، ثم يعرض خيار تثبيت Unified Remote (للتحكم بالجوال).
; البناء:  "%LOCALAPPDATA%\Programs\Inno Setup 6\ISCC.exe" installer.iss

#define MyAppName "FAHAD TV"
#define MyAppVersion "1.36"
#define MyAppPublisher "FAHAD"
#define MyAppExeName "FAHAD_TV.exe"

[Setup]
AppId={{8F2A6C41-3B7D-4E19-9A55-FA0D7C1E9B22}}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\FAHAD TV
DefaultGroupName=FAHAD TV
DisableProgramGroupPage=yes
OutputDir=dist
OutputBaseFilename=FAHAD TV-{#MyAppVersion}-Setup
SetupIconFile=icon.ico
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
ArchitecturesInstallIn64BitMode=x64compatible
ArchitecturesAllowed=x64compatible
PrivilegesRequired=admin
UninstallDisplayIcon={app}\{#MyAppExeName}

[Languages]
Name: "arabic"; MessagesFile: "compiler:Languages\Arabic.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"
Name: "unifiedremote"; Description: "تثبيت Unified Remote — للتحكم بـ FAHAD TV من جوالك"; GroupDescription: "برامج مصاحبة (مستحسنة):"; Check: UnifiedRemoteNotInstalled

[Files]
Source: "build\exe.win-amd64-3.14\*"; DestDir: "{app}"; Flags: recursesubdirs createallsubdirs ignoreversion
Source: "vendor\UnifiedRemoteSetup.exe"; Flags: dontcopy

[Icons]
Name: "{group}\FAHAD TV"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\إعادة تشغيل FAHAD TV"; Filename: "{app}\{#MyAppExeName}"; Parameters: "--restart"; Comment: "إعادة تشغيل تطبيق FAHAD TV"
Name: "{group}\{cm:UninstallProgram,FAHAD TV}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\FAHAD TV"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon
Name: "{autodesktop}\إعادة تشغيل FAHAD TV"; Filename: "{app}\{#MyAppExeName}"; Parameters: "--restart"; Comment: "إعادة تشغيل تطبيق FAHAD TV"; Tasks: desktopicon

[Run]
; يشغّل مثبّت Unified Remote إذا اختار المستخدم المهمة (يظهر معالجه الخاص للمستخدم)
Filename: "{tmp}\UnifiedRemoteSetup.exe"; StatusMsg: "جارٍ تشغيل مثبّت Unified Remote..."; Tasks: unifiedremote; Flags: waituntilterminated
; يشغّل FAHAD TV بعد الانتهاء (اختياري من صفحة النهاية)
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,FAHAD TV}"; Flags: nowait postinstall skipifsilent

[Code]
{ يفحص إن كان Unified Remote مثبّتاً مسبقاً — فلا نعرض خيار تثبيته }
function UnifiedRemoteNotInstalled(): Boolean;
begin
  Result := not (
    DirExists(ExpandConstant('{commonpf32}\Unified Remote 3')) or
    DirExists(ExpandConstant('{commonpf}\Unified Remote 3')) or
    DirExists(ExpandConstant('{commonpf32}\Unified Remote')) or
    RegKeyExists(HKLM, 'SOFTWARE\Unified Intents') or
    RegKeyExists(HKLM, 'SOFTWARE\WOW6432Node\Unified Intents')
  );
end;

{ استخراج مثبّت Unified Remote من الحزمة إلى مجلد مؤقت قبل تشغيله }
procedure CurStepChanged(CurStep: TSetupStep);
begin
  if (CurStep = ssInstall) and WizardIsTaskSelected('unifiedremote') then
    ExtractTemporaryFile('UnifiedRemoteSetup.exe');
end;
