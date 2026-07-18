# Smart Windows TV Launcher – Complete Development Prompt

I am building a premium Windows application that behaves like **Android TV / Google TV / Apple TV / Steam Big Picture**. The application should replace the traditional Windows desktop with a TV-friendly launcher that displays beautiful application cards, launches Windows applications, and provides a modern, highly customizable experience.

The project should be built using clean architecture and modern Windows technologies (preferably WinUI 3 or WPF with MVVM).

---

# 1. Launch Any Windows Application

The launcher must be able to launch **any application installed on Windows**.

Supported sources:

* Installed Win32 applications
* Microsoft Store (UWP) applications
* Portable applications
* Desktop shortcuts
* Start Menu shortcuts
* Custom executable files (.exe)

Selecting a card should immediately launch the application.

---

# 2. Add Applications

Each **"Add Application"** card should allow the user to:

* Browse for an EXE file.
* Browse Desktop shortcuts.
* Browse Start Menu shortcuts.
* Detect installed applications automatically.
* Import any Windows application.

After adding an application:

* Automatically detect its name.
* Automatically extract its icon.
* Create a new card immediately.
* Save it permanently.

---

# 3. Automatic Icon Detection

When an application is added:

* Extract its executable icon automatically.
* If extraction fails:

  * Search online automatically.
  * Suggest multiple icons.
  * Allow the user to choose one.

---

# 4. Custom Icons

The launcher should include a complete Icon Manager.

Supported options:

* Use default application icon.
* Select PNG.
* Select JPG.
* Select ICO.
* Drag & Drop icon files.
* Select icons from Desktop.
* Select icons from any folder.
* Search icons online.

Example:

Search:

Netflix

Results:

* Netflix Logo
* Netflix Icon
* Material Icon
* Flat Icon
* SVG Icon

The user should be able to select any result and apply it instantly.

---

# 5. Edit Applications

Every application card should be fully editable.

The user must be able to modify:

* Display name
* Executable path
* Shortcut path
* Icon
* Card color
* Category
* Position
* Background image
* Launch parameters
* Custom artwork

Changes should apply instantly without restarting.

---

# 6. Hero Background

When an application card is focused, the launcher background should change automatically.

Examples:

Netflix → Netflix wallpaper

Steam → Gaming wallpaper

Chrome → Chrome wallpaper

Settings → Windows Settings wallpaper

Requirements:

* Blur effect
* Smooth fade animation
* Animated transitions
* Cached backgrounds

---

# 7. Settings

Create a modern Settings page.

Appearance

* Dark Mode
* Light Mode
* Accent Color
* Blur Strength
* Transparency
* Fluent Design
* Acrylic / Mica

Home Screen

* Background image
* Animated wallpaper
* Clock position
* Clock size
* Date format
* Categories visibility
* Card size
* Card spacing
* Number of columns

Animations

* Enable/Disable animations
* Animation speed
* Focus animation
* Background transition
* Hover animation

---

# 8. Power Menu

Add permanent system actions.

* Exit Launcher
* Restart Computer
* Shutdown Computer

Optional:

* Sleep
* Lock
* Sign Out

---

# 9. Navigation & Input Support

The launcher must fully support multiple input methods and provide a seamless navigation experience similar to Android TV and Google TV.

## Keyboard

- Arrow Keys
- Enter
- Escape
- Backspace
- Tab
- Space
- Function Keys (optional shortcuts)

## Mouse

Provide full mouse support, including:

- Left Click to launch applications.
- Right Click to open the context menu.
- Double Click (optional) to launch applications.
- Drag & Drop to rearrange application cards.
- Mouse Wheel scrolling.
- Hover animations and visual feedback.
- Smooth pointer interaction throughout the launcher.

## Game Controllers

Support:

- Xbox Controller
- PlayStation Controller
- Generic XInput Controllers
- Generic DirectInput Controllers

Navigation should support:

- D-Pad
- Analog Stick
- A / X to Select
- B / Circle to Go Back
- Shoulder Buttons for category navigation (optional)

## TV Remote Controls

Support common Windows-compatible TV remotes and media remotes.

Functions should include:

- Directional Navigation (Up, Down, Left, Right)
- OK / Enter
- Back
- Home
- Menu
- Play / Pause
- Media Control Buttons (where available)

The launcher should automatically recognize supported remote controls without requiring additional configuration whenever possible.

## Navigation Experience

Regardless of the input method (Keyboard, Mouse, Game Controller, or TV Remote), navigation should feel smooth and identical to Android TV / Google TV.

The currently focused application card should always be clearly highlighted with smooth focus animations, and users should be able to switch seamlessly between all supported input methods without restarting or changing any settings.

---

# 10. Mouse Support

Support full mouse interaction.

Requirements:

* Left Click
* Right Click
* Double Click
* Drag & Drop
* Mouse Wheel
* Hover animations
* Smooth scrolling

---

# 11. Right Click Context Menu

When the user right-clicks any application card, show a Fluent Design context menu.

Include:

* Launch
* Edit
* Rename
* Change Icon
* Change Application
* Change Background
* Move
* Duplicate
* Pin
* Unpin
* Add to Favorites
* Remove from Home
* Delete Shortcut
* Delete Application
* Properties

---

# 12. Application Action Icons

Every application card should display (or reveal on hover/focus) quick action icons.

Include:

* Launch
* Edit
* Rename
* Change Icon
* Move
* Duplicate
* Favorite
* Pin
* Remove from Home
* Delete Shortcut
* Delete Application

Deleting the shortcut should not necessarily uninstall the application—it should only remove it from the launcher unless the user explicitly chooses otherwise.

---

# 13. Categories

Allow unlimited categories.

Examples:

* Entertainment
* Games
* Utilities
* Browsers
* Office
* Media
* Development
* Custom

Allow:

* Add
* Rename
* Delete
* Reorder

---

# 14. Drag & Drop

Allow:

* Move cards
* Rearrange cards
* Move cards between categories
* Automatically save layout

Restore layout after restart.

---

# 15. Shortcut Manager

Create a Shortcut Manager.

Allow users to:

* Create shortcuts
* Edit shortcuts
* Replace shortcut target
* Delete shortcuts
* Duplicate shortcuts
* Import shortcuts
* Export shortcuts
* Restore defaults

---

# 16. Search

Global search should instantly search:

* Installed applications
* Added applications
* Categories

Results should appear instantly while typing.

---

## 17. Application Management & User Interaction

Improve application management to provide a complete launcher experience similar to Android TV while remaining optimized for Windows.

### Card Position Management

The user must be able to:

* Move application cards anywhere on the Home Screen.
* Rearrange applications using Drag & Drop.
* Change the order of applications within a category.
* Move applications between categories.
* Save the layout automatically.
* Restore the saved layout when the launcher starts.

---

### Context Menu (Right Click)

Support full mouse interaction.

When the user **right-clicks** on any application card, display a context menu with options such as:

* Launch
* Edit
* Rename
* Change Icon
* Change Application
* Change Background
* Move
* Duplicate
* Remove from Home
* Delete Shortcut
* Properties

The context menu should match the Windows 11 Fluent Design style.

---

### Edit Application

Every added application must be fully editable.

The user should be able to modify:

* Display name
* Executable path
* Application shortcut
* Icon
* Background image
* Card color
* Category
* Card position
* Launch parameters
* Custom artwork

Changes should be applied immediately without restarting the launcher.

---

### Shortcut Management

Provide a dedicated shortcut manager.

The user can:

* Create a shortcut.
* Edit a shortcut.
* Replace the application linked to a shortcut.
* Delete a shortcut.
* Duplicate a shortcut.
* Import shortcuts.
* Export shortcuts.
* Restore default shortcuts.

---

### Application Actions

Every application card should display small action icons (or reveal them on hover/focus), allowing quick access to:

* Launch Application
* Edit
* Rename
* Change Icon
* Move
* Duplicate
* Remove from Home
* Delete Shortcut
* Pin / Unpin
* Add to Favorites

---

### Mouse Support

The launcher must support full mouse interaction in addition to keyboard and controller navigation.

Requirements:

* Left-click to launch applications.
* Right-click to open the context menu.
* Double-click (optional) to launch.
* Drag & Drop using the mouse.
* Smooth hover animations.
* Resize support where appropriate.
* Modern Fluent Design context menus.
* Smooth scrolling using the mouse wheel.

The launcher should provide an experience that feels native to Windows while maintaining the simplicity and elegance of Android TV.

---

# 18. Launch at Windows Startup

Inside Settings, add:

**Launch automatically when Windows starts**

(On / Off)

When enabled:

* Register the launcher in Windows Startup.
* Launch automatically after Windows login.

When disabled:

* Remove it from Startup.

Save this preference permanently.

On the first launch, display:

**Do you want Smart Windows TV Launcher to start automatically with Windows?**

Options:

* Yes
* No
* Don't ask again

The user can change this later from Settings.

When the launcher starts automatically, it should restore:

* Last selected category
* Last focused application
* Card layout
* Scroll position

---

# 19. Home Screen Customization

Allow the user to customize:

* Card positions
* Card sizes
* Number of rows
* Number of columns
* Background image
* Animated wallpaper
* Clock position
* Date format
* Category order
* Home screen layout

Everything should save automatically.

---

# 20. Performance

Requirements:

* Fast startup
* Asynchronous loading
* Cache icons
* Cache wallpapers
* Lazy loading
* Smooth animations
* Support hundreds of applications without lag

---

# 21. Code Architecture

Use:

* Clean Architecture
* MVVM
* Reusable Components
* Dependency Injection
* JSON Configuration
* Modular Design
* Well-documented code
* Easy future expansion

---

# 22. Overall Goal

The final product should feel like a **professional commercial launcher**, not a simple Windows application.

It should combine the best ideas from:

* Android TV
* Google TV
* Apple TV
* Steam Big Picture
* Windows 11 Fluent Design

The launcher should provide a premium TV-like experience while giving users full control over applications, icons, shortcuts, backgrounds, layouts, settings, startup behavior, and interface customization, with smooth animations, high performance, and complete mouse, keyboard, controller, and remote support.

