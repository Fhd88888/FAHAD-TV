import sys
from cx_Freeze import setup, Executable

# Dependencies are automatically detected, but it might need fine tuning.
build_exe_options = {
    "packages": ["os", "json", "urllib", "subprocess", "uuid", "webview"],
    "include_files": ["ui.html", "icon.png", "app.js", "app.css", "entertainment.js", "entertainment.css"],
    "excludes": [],
}

# base="gui" should be used only for Windows GUI app
base = "gui" if sys.platform == "win32" else None

bdist_msi_options = {
    "add_to_path": False,
    "initial_target_dir": r"[ProgramFilesFolder]\FAHAD TV",
}

setup(
    name="FAHAD TV",
    version="1.36",
    description="Smart TV Launcher for Windows",
    options={
        "build_exe": build_exe_options,
        "bdist_msi": bdist_msi_options,
    },
    executables=[Executable("app.py", base=base, target_name="FAHAD_TV.exe", shortcut_name="FAHAD TV", shortcut_dir="DesktopFolder", icon="icon.ico")]
)
