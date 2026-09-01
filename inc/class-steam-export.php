<?php
/**
 * Steam (Windows) export.
 *
 * @package OrbemStudio
 */

namespace OrbemStudio;

/**
 * Builds a runnable Windows desktop version of the game.
 *
 * A packaged Electron app is just the official Electron runtime with the app
 * placed in resources/app/ and the executable renamed, so nothing is compiled
 * here: the runtime zip is downloaded once from the Electron project's GitHub
 * releases, cached, and every export copies it and rewrites a few zip entries.
 */
class Steam_Export
{
    /**
     * Electron release used for new builds.
     */
    private const ELECTRON_VERSION = 'v44.1.0';

    /**
     * Where official Electron release assets live.
     */
    private const RELEASE_BASE = 'https://github.com/electron/electron/releases/download/';

    /**
     * Options holding the Steamworks IDs used to generate build scripts.
     */
    private const APP_ID_OPTION = 'orbem_steam_app_id';

    private const DEPOT_ID_OPTION = 'orbem_steam_depot_id';

    /**
     * Written into the build scripts when no App ID has been entered yet.
     */
    private const ID_PLACEHOLDER = 'REPLACE_WITH_YOUR_APP_ID';

    /**
     * Directory inside uploads holding the cached runtime.
     */
    private const STORAGE_DIR = 'orbem-studio-steam';

    /**
     * Path inside the zip that Electron loads the app from.
     */
    private const APP_PATH = 'resources/app/';

    /**
     * Bytes read per chunk when streaming the finished build.
     */
    private const STREAM_CHUNK = 1048576;

    private object $plugin;

    private Export_Import $export_import;

    public function __construct(object $plugin, Export_Import $export_import)
    {
        $this->plugin        = $plugin;
        $this->export_import = $export_import;
    }

    /**
     * Build and download the Windows game in one click.
     *
     * @action admin_init
     */
    public function handleSteamExport(): void
    {
        if (
            !isset($_POST['orbem_action'], $_POST['orbem_steam_nonce']) ||
            'export_steam' !== sanitize_text_field(wp_unslash($_POST['orbem_action'])) ||
            !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['orbem_steam_nonce'])), 'orbem_export_steam') ||
            !current_user_can('manage_options')
        ) {
            return;
        }

        if (!class_exists('ZipArchive')) {
            $this->error(__('The PHP zip extension (ZipArchive) is not available on this server.', 'orbem-studio'));
        }

        set_time_limit(0);

        $index = $this->export_import->buildGameIndex();

        if ('' !== $index['error']) {
            $this->error($index['error']);
        }

        $runtime = $this->ensureRuntime();

        if ('' !== $runtime['error']) {
            $this->error($runtime['error']);
        }

        $build = wp_tempnam('orbem-steam');

        if (empty($build)) {
            $this->error(__('Could not create a temporary file for the build.', 'orbem-studio'));
        }

        // Work on a copy so the cached runtime is never modified.
        if (!copy($runtime['path'], $build)) {
            wp_delete_file($build);
            $this->error(__('Could not copy the Windows runtime. Check the free disk space on this server.', 'orbem-studio'));
        }

        $zip = new \ZipArchive();

        if (true !== $zip->open($build)) {
            wp_delete_file($build);
            $this->error(__('Could not open the copied runtime archive.', 'orbem-studio'));
        }

        $executable = $this->getExecutableName();

        // Electron falls back to this when there is no app folder -- drop it.
        $zip->deleteName('resources/default_app.asar');

        $zip->addFromString(self::APP_PATH . 'package.json', $this->buildAppPackageJson());
        $zip->addFromString(self::APP_PATH . 'main.js', $this->buildAppMainJs());
        $zip->addFromString(self::APP_PATH . 'index.html', $index['html']);

        $icon = $this->getIconPng();

        if ('' !== $icon) {
            $zip->addFromString(self::APP_PATH . 'icon.png', $icon);
        }

        $zip->renameName('electron.exe', $executable);

        $zip->addFromString('steam_build/app_build.vdf', $this->buildAppVdf());
        $zip->addFromString('steam_build/depot_build.vdf', $this->buildDepotVdf());
        $zip->addFromString('upload_to_steam.bat', $this->buildUploadBat());
        $zip->addFromString('STEAM-README.txt', $this->buildReadme($executable));
        $zip->close();

        $this->streamFile(
            $build,
            'orbem-steam-win-' . sanitize_title(get_bloginfo('name')) . '-' . gmdate('Y-m-d') . '.zip'
        );
    }

    /**
     * Delete the cached Electron runtime.
     *
     * @action admin_init
     */
    public function handleRuntimeDelete(): void
    {
        if (
            !isset($_POST['orbem_action'], $_POST['orbem_runtime_delete_nonce']) ||
            'delete_steam_runtime' !== sanitize_text_field(wp_unslash($_POST['orbem_action'])) ||
            !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['orbem_runtime_delete_nonce'])), 'orbem_delete_steam_runtime') ||
            !current_user_can('manage_options')
        ) {
            return;
        }

        $path = $this->getRuntimePath();

        if ('' !== $path) {
            wp_delete_file($path);
        }

        wp_safe_redirect(
            add_query_arg('steam_runtime_deleted', '1', admin_url('admin.php?page=orbem-studio-export-import'))
        );
        exit;
    }

    /**
     * Everything the admin screen needs to describe the current state.
     *
     * @return array{version: string, cached: bool, size: string, app_id: string, depot_id: string, depot_auto: bool}
     */
    public function getStatus(): array
    {
        $runtime = $this->getRuntimePath();

        return [
            'app_id'     => $this->getAppId(),
            'depot_id'   => $this->getDepotId(),
            'depot_auto' => '' === $this->sanitizeSteamId((string) get_option(self::DEPOT_ID_OPTION, '')),
            'version'    => $this->getElectronVersion(),
            'cached'     => '' !== $runtime,
            'size'       => '' === $runtime ? '' : size_format((int) filesize($runtime)),
        ];
    }

    /**
     * The Electron release this site builds against.
     */
    private function getElectronVersion(): string
    {
        /**
         * Filters the Electron release used for Windows builds.
         *
         * @param string $version Tag name, for example "v44.1.0".
         */
        $version = (string) apply_filters('orbem_studio_electron_version', self::ELECTRON_VERSION);

        return preg_match('/^v\d+\.\d+\.\d+$/', $version) ? $version : self::ELECTRON_VERSION;
    }

    /**
     * File name of the Windows runtime asset for the current version.
     */
    private function getRuntimeFilename(): string
    {
        return 'electron-' . $this->getElectronVersion() . '-win32-x64.zip';
    }

    /**
     * Path of the cached runtime, or an empty string when it is not downloaded.
     */
    public function getRuntimePath(): string
    {
        $directory = $this->getStorageDir();

        if ('' === $directory) {
            return '';
        }

        $path = trailingslashit($directory) . $this->getRuntimeFilename();

        return (is_readable($path) && filesize($path) > 0) ? $path : '';
    }

    /**
     * Make sure the Electron runtime is cached, downloading it when needed.
     *
     * @return array{path: string, error: string}
     */
    private function ensureRuntime(): array
    {
        $cached = $this->getRuntimePath();

        if ('' !== $cached) {
            return ['path' => $cached, 'error' => ''];
        }

        return $this->downloadRuntime();
    }

    /**
     * Download the official Electron Windows runtime and verify its checksum.
     *
     * @return array{path: string, error: string}
     */
    private function downloadRuntime(): array
    {
        $directory = $this->getStorageDir();

        if ('' === $directory) {
            return ['path' => '', 'error' => __('Could not create the storage directory inside uploads.', 'orbem-studio')];
        }

        $version  = $this->getElectronVersion();
        $filename = $this->getRuntimeFilename();
        $base     = self::RELEASE_BASE . $version . '/';

        /**
         * Filters the URL the Electron Windows runtime is downloaded from.
         *
         * @param string $url      Download URL.
         * @param string $version  Electron version tag.
         */
        $url = (string) apply_filters('orbem_studio_electron_url', $base . $filename, $version);

        $expected = $this->fetchExpectedChecksum($base . 'SHASUMS256.txt', $filename);

        $tmp = wp_tempnam('orbem-electron');

        if (empty($tmp)) {
            return ['path' => '', 'error' => __('Could not create a temporary file for the download.', 'orbem-studio')];
        }

        $response = wp_remote_get(
            $url,
            [
                'timeout'     => 900,
                'redirection' => 5,
                'stream'      => true,
                'filename'    => $tmp,
            ]
        );

        if (is_wp_error($response)) {
            wp_delete_file($tmp);

            return [
                'path'  => '',
                'error' => sprintf(
                    /* translators: %s: error message from the HTTP request. */
                    __('Could not download the Electron runtime: %s', 'orbem-studio'),
                    $response->get_error_message()
                ),
            ];
        }

        if (200 !== wp_remote_retrieve_response_code($response)) {
            wp_delete_file($tmp);

            return [
                'path'  => '',
                'error' => sprintf(
                    /* translators: %s: download URL. */
                    __('The Electron runtime could not be downloaded from %s.', 'orbem-studio'),
                    $url
                ),
            ];
        }

        if ('' !== $expected && !hash_equals($expected, (string) hash_file('sha256', $tmp))) {
            wp_delete_file($tmp);

            return ['path' => '', 'error' => __('The downloaded Electron runtime failed its checksum -- the download was incomplete or altered. Try again.', 'orbem-studio')];
        }

        $validation = $this->validateRuntime($tmp);

        if ('' !== $validation) {
            wp_delete_file($tmp);

            return ['path' => '', 'error' => $validation];
        }

        $destination = trailingslashit($directory) . $filename;

        if (!$this->moveFile($tmp, $destination)) {
            wp_delete_file($tmp);

            return ['path' => '', 'error' => __('Could not save the downloaded runtime into the uploads folder.', 'orbem-studio')];
        }

        $this->pruneOldRuntimes($directory, $filename);

        return ['path' => $destination, 'error' => ''];
    }

    /**
     * Delete cached runtimes from previous Electron versions.
     *
     * The version is part of the file name, so a newly pinned version simply
     * downloads alongside the old one. Without this, every upgrade would leave
     * another 150 MB behind in the uploads folder.
     */
    private function pruneOldRuntimes(string $directory, string $keep): void
    {
        $existing = glob(trailingslashit($directory) . 'electron-*-win32-x64.zip');

        if (false === $existing) {
            return;
        }

        foreach ($existing as $file) {
            if (basename($file) !== $keep) {
                wp_delete_file($file);
            }
        }
    }

    /**
     * Read the official checksum for an asset out of a release SHASUMS256.txt.
     *
     * @return string Empty string when the checksum list could not be read.
     */
    private function fetchExpectedChecksum(string $url, string $filename): string
    {
        $response = wp_remote_get($url, ['timeout' => 30, 'redirection' => 5]);

        if (is_wp_error($response) || 200 !== wp_remote_retrieve_response_code($response)) {
            return '';
        }

        $lines = preg_split('/\R/', (string) wp_remote_retrieve_body($response)) ?: [];

        foreach ($lines as $line) {
            // Lines look like: <sha256> *electron-v44.1.0-win32-x64.zip
            if (preg_match('/^([a-f0-9]{64})\s+\*?(.+)$/i', trim($line), $match) && trim($match[2]) === $filename) {
                return strtolower($match[1]);
            }
        }

        return '';
    }

    /**
     * Check that a zip really is an Electron Windows runtime.
     *
     * @return string Empty string when valid, otherwise the reason it was rejected.
     */
    private function validateRuntime(string $path): string
    {
        $zip = new \ZipArchive();

        if (true !== $zip->open($path)) {
            return __('The downloaded runtime is not a readable zip archive.', 'orbem-studio');
        }

        $has_exe = false !== $zip->locateName('electron.exe');
        $zip->close();

        if (false === $has_exe) {
            return __('The downloaded runtime does not contain electron.exe.', 'orbem-studio');
        }

        return '';
    }

    /**
     * Name of the executable inside the build.
     */
    private function getExecutableName(): string
    {
        $name = sanitize_file_name(get_bloginfo('name'));
        $name = trim(preg_replace('/[^A-Za-z0-9 _-]/', '', $name) ?? '');
        $name = trim(preg_replace('/\s+/', ' ', $name) ?? '');

        if ('' === $name) {
            $name = 'OrbemGame';
        }

        return $name . '.exe';
    }

    /**
     * package.json Electron reads to find the app entry point.
     */
    private function buildAppPackageJson(): string
    {
        $name = sanitize_title(get_bloginfo('name'));

        $package = [
            'name'        => '' === $name ? 'orbem-game' : $name,
            'productName' => get_bloginfo('name'),
            'version'     => defined('ORBEM_STUDIO_VERSION') ? ORBEM_STUDIO_VERSION : '1.0.0',
            'main'        => 'main.js',
            'private'     => true,
        ];

        return (string) wp_json_encode($package, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    }

    /**
     * The Electron entry script injected into every build.
     *
     */
    private function buildAppMainJs(): string
    {
        return <<<'JS'
/**
 * Orbem Studio game shell -- generated by the WordPress plugin.
 */

const { app, BrowserWindow, shell, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');

// Game audio and intro videos start without a click, the same as in a browser.
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

let mainWindow = null;

function createWindow() {
    const iconPath = path.join(__dirname, 'icon.png');

    const options = {
        width: 1280,
        height: 720,
        fullscreen: true,
        backgroundColor: '#000000',
        autoHideMenuBar: true,
        show: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            // The exported page loads its images, audio and saved progress from
            // the WordPress site it was built from, cross origin from file://.
            webSecurity: false,
        },
    };

    if (fs.existsSync(iconPath)) {
        options.icon = iconPath;
    }

    mainWindow = new BrowserWindow(options);
    mainWindow.removeMenu();
    mainWindow.loadFile(path.join(__dirname, 'index.html'));

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // Anything opening a new window goes to the player's browser instead.
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(() => {
    createWindow();

    globalShortcut.register('F11', () => {
        if (mainWindow) {
            mainWindow.setFullScreen(!mainWindow.isFullScreen());
        }
    });

    globalShortcut.register('Escape', () => {
        if (mainWindow && mainWindow.isFullScreen()) {
            mainWindow.setFullScreen(false);
        }
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
    app.quit();
});
JS;
    }

    /**
     * The site icon as PNG bytes, used for the window and taskbar icon.
     *
     * @return string Empty string when there is no usable PNG.
     */
    private function getIconPng(): string
    {
        $url = get_site_icon_url(256);

        if (empty($url)) {
            return '';
        }

        $response = wp_remote_get($url, ['timeout' => 30, 'redirection' => 3]);

        if (is_wp_error($response) || 200 !== wp_remote_retrieve_response_code($response)) {
            return '';
        }

        $body = (string) wp_remote_retrieve_body($response);

        // Only a real PNG is useful to Electron here.
        return str_starts_with($body, "\x89PNG\r\n\x1a\n") ? $body : '';
    }

    /**
     * Save the Steamworks App ID and Depot ID.
     *
     * @action admin_init
     */
    public function handleSteamSettings(): void
    {
        if (
            !isset($_POST['orbem_action'], $_POST['orbem_steam_ids_nonce']) ||
            'save_steam_ids' !== sanitize_text_field(wp_unslash($_POST['orbem_action'])) ||
            !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['orbem_steam_ids_nonce'])), 'orbem_save_steam_ids') ||
            !current_user_can('manage_options')
        ) {
            return;
        }

        $app_id   = isset($_POST['orbem_steam_app_id'])
            ? $this->sanitizeSteamId(sanitize_text_field(wp_unslash($_POST['orbem_steam_app_id'])))
            : '';
        $depot_id = isset($_POST['orbem_steam_depot_id'])
            ? $this->sanitizeSteamId(sanitize_text_field(wp_unslash($_POST['orbem_steam_depot_id'])))
            : '';

        update_option(self::APP_ID_OPTION, $app_id);
        update_option(self::DEPOT_ID_OPTION, $depot_id);

        wp_safe_redirect(
            add_query_arg('steam_ids_saved', '1', admin_url('admin.php?page=orbem-studio-export-import'))
        );
        exit;
    }

    /**
     * Keep only the digits of a Steamworks ID, within a plausible length.
     */
    private function sanitizeSteamId(string $value): string
    {
        $digits = preg_replace('/\D/', '', $value) ?? '';

        return strlen($digits) > 0 && strlen($digits) <= 10 ? $digits : '';
    }

    /**
     * The configured Steam App ID, or an empty string.
     */
    public function getAppId(): string
    {
        return $this->sanitizeSteamId((string) get_option(self::APP_ID_OPTION, ''));
    }

    /**
     * The configured Depot ID.
     *
     * Steam's own convention is App ID + 1, which is used when none is set.
     */
    public function getDepotId(): string
    {
        $depot = $this->sanitizeSteamId((string) get_option(self::DEPOT_ID_OPTION, ''));

        if ('' !== $depot) {
            return $depot;
        }

        $app = $this->getAppId();

        return '' === $app ? '' : (string) ((int) $app + 1);
    }

    /**
     * The app build script ContentBuilder runs.
     *
     * Paths are relative to this file, which ships in steam_build/ inside the
     * export, so ".." is the folder holding the game.
     */
    private function buildAppVdf(): string
    {
        $template = <<<'VDF'
// Steam build script generated by Orbem Studio.
// Run it with: steamcmd +login <user> +run_app_build <path to this file> +quit
// Or just double click upload_to_steam.bat in the folder above.

"appbuild"
{
	"appid"	"{{APP_ID}}"
	"desc"	"{{DESC}}"

	// Where steamcmd writes its logs and chunk cache.
	"buildoutput"	"output\"

	// The folder that gets uploaded -- one level up from this script.
	"contentroot"	"..\"

	// "1" = dry run: report what would be uploaded without publishing.
	// Change to "0" once a preview run looks right.
	"preview"	"1"

	// Leave empty to upload without setting a branch live.
	// Set to "default" only when you are ready to publish to everyone.
	"setlive"	""

	"depots"
	{
		"{{DEPOT_ID}}"	"depot_build.vdf"
	}
}
VDF;

        return $this->toWindowsText(
            strtr(
                $template,
                [
                    '{{APP_ID}}'   => $this->getAppId() ?: self::ID_PLACEHOLDER,
                    '{{DEPOT_ID}}' => $this->getDepotId() ?: self::ID_PLACEHOLDER,
                    '{{DESC}}'     => $this->getBuildDescription(),
                ]
            )
        );
    }

    /**
     * The depot script naming what actually goes into the depot.
     */
    private function buildDepotVdf(): string
    {
        $template = <<<'VDF'
// Depot contents, generated by Orbem Studio.

"DepotBuildConfig"
{
	"DepotID"	"{{DEPOT_ID}}"

	// The same folder the app build script uploads.
	"contentroot"	"..\"

	// Everything in that folder, recursively.
	"FileMapping"
	{
		"LocalPath"	"*"
		"DepotPath"	"."
		"recursive"	"1"
	}

	// Build tooling and notes do not belong in the shipped game.
	"FileExclusion"	"steam_build\*"
	"FileExclusion"	"steamcmd\*"
	"FileExclusion"	"upload_to_steam.bat"
	"FileExclusion"	"STEAM-README.txt"
	"FileExclusion"	"*.pdb"
}
VDF;

        return $this->toWindowsText(
            str_replace('{{DEPOT_ID}}', $this->getDepotId() ?: self::ID_PLACEHOLDER, $template)
        );
    }

    /**
     * Human readable build description shown in the Steamworks builds list.
     */
    private function getBuildDescription(): string
    {
        $name = str_replace('"', '', get_bloginfo('name'));

        return sprintf('%s -- Orbem Studio build %s UTC', $name, gmdate('Y-m-d H:i'));
    }

    /**
     * A double clickable uploader that fetches steamcmd and runs the build.
     */
    private function buildUploadBat(): string
    {
        $template = <<<'BAT'
@echo off
setlocal
title Upload to Steam - Orbem Studio

echo ==================================================
echo   Orbem Studio - upload this build to Steam
echo ==================================================
echo.

set "BUILD_SCRIPT=%~dp0steam_build\app_build.vdf"
set "STEAMCMD_DIR=%~dp0steamcmd"
set "STEAMCMD=%STEAMCMD_DIR%\steamcmd.exe"

if not exist "%BUILD_SCRIPT%" (
    echo ERROR: cannot find steam_build\app_build.vdf next to this script.
    echo Extract the whole zip first, then run this from the extracted folder.
    goto :done
)

findstr /C:"{{PLACEHOLDER}}" "%BUILD_SCRIPT%" >nul
if not errorlevel 1 (
    echo Your Steam App ID has not been set yet.
    echo.
    echo In WordPress open Orbem Studio - Export / Import - Export for Steam,
    echo enter your App ID, and build again. Or edit these by hand:
    echo   steam_build\app_build.vdf
    echo   steam_build\depot_build.vdf
    goto :done
)

if not exist "%STEAMCMD%" (
    echo steamcmd was not found, downloading it from Valve...
    if not exist "%STEAMCMD_DIR%" mkdir "%STEAMCMD_DIR%"
    powershell -NoProfile -Command "Invoke-WebRequest -Uri 'https://steamcdn-a.akamaihd.net/client/installer/steamcmd.zip' -OutFile '%STEAMCMD_DIR%\steamcmd.zip'"
    powershell -NoProfile -Command "Expand-Archive -Path '%STEAMCMD_DIR%\steamcmd.zip' -DestinationPath '%STEAMCMD_DIR%' -Force"
)

if not exist "%STEAMCMD%" (
    echo ERROR: steamcmd could not be downloaded.
    echo Get it from https://partner.steamgames.com/doc/sdk/uploading
    echo and put steamcmd.exe in a "steamcmd" folder next to this script.
    goto :done
)

echo This build is in PREVIEW mode: it reports what would be uploaded without
echo publishing anything. When a preview run looks right, open
echo steam_build\app_build.vdf and change "preview" from "1" to "0".
echo.

set /p STEAM_USER="Steam username: "
if "%STEAM_USER%"=="" (
    echo No username entered.
    goto :done
)

echo.
echo Running the build. Steam Guard will prompt you if it needs a code.
echo.
"%STEAMCMD%" +login %STEAM_USER% +run_app_build "%BUILD_SCRIPT%" +quit

echo.
echo Finished. Check above for errors, then find your build in Steamworks
echo under SteamPipe - Builds.

:done
echo.
pause
endlocal
BAT;

        return $this->toWindowsText(str_replace('{{PLACEHOLDER}}', self::ID_PLACEHOLDER, $template));
    }

    /**
     * Normalise generated text to CRLF so Windows tools read it correctly.
     */
    private function toWindowsText(string $text): string
    {
        return str_replace("\n", "\r\n", str_replace("\r\n", "\n", $text)) . "\r\n";
    }

    /**
     * Notes shipped inside the export, written around the generated scripts.
     */
    private function buildReadme(string $executable): string
    {
        $configured = '' !== $this->getAppId();

        $lines = [
            'Orbem Studio -- Windows build for Steam',
            '=======================================',
            '',
            sprintf('Game:    %s', get_bloginfo('name')),
            sprintf('Built:   %s UTC', gmdate('Y-m-d H:i')),
            sprintf('Runtime: Electron %s (win32 x64)', $this->getElectronVersion()),
        ];

        if ($configured) {
            $lines[] = sprintf('App ID:  %s    Depot ID: %s', $this->getAppId(), $this->getDepotId());
        }

        $lines = array_merge($lines, [
            '',
            'PLAY IT',
            '-------',
            sprintf('Double click %s. Your game is in resources/app/ --', $executable),
            'everything else is the Electron runtime.',
            '',
            'IMPORTANT: this build loads images, audio, video and saved progress from your',
            'WordPress site over the internet. Keep the site online and the game page',
            'published, or players will see a partially loaded game.',
            '',
            'UPLOAD IT TO STEAM',
            '------------------',
        ]);

        if ($configured) {
            $lines = array_merge($lines, [
                'Everything is filled in already. Just:',
                '',
                '  1. Extract this whole zip somewhere.',
                '  2. Double click upload_to_steam.bat',
                '  3. Enter your Steam username (and Steam Guard code when asked).',
                '',
                'The first run downloads steamcmd from Valve automatically.',
                '',
                'The build starts in PREVIEW mode -- it reports what would be uploaded',
                'without publishing anything, so you can check it safely. When the preview',
                'looks right, open steam_build\\app_build.vdf and change:',
                '',
                '    "preview"    "1"      ->      "preview"    "0"',
                '',
                'then run upload_to_steam.bat again to upload for real.',
            ]);
        } else {
            $lines = array_merge($lines, [
                'No Steam App ID was set when this was built, so the build scripts have',
                'placeholders in them.',
                '',
                'Easiest fix: in WordPress open Orbem Studio -> Export / Import ->',
                'Export for Steam, enter your App ID, and build again. Everything below',
                'will then be filled in for you.',
                '',
                'Or edit steam_build\\app_build.vdf and steam_build\\depot_build.vdf by hand,',
                'replacing ' . self::ID_PLACEHOLDER . ' with your real IDs.',
            ]);
        }

        $lines = array_merge($lines, [
            '',
            'AFTER THE UPLOAD',
            '----------------',
            'In Steamworks (https://partner.steamgames.com):',
            '',
            '  * SteamPipe -> Builds shows the build you just pushed. Set it live on a',
            '    branch when you are happy with it.',
            sprintf('  * Installation -> General: set the launch executable to %s', $executable),
            '  * Fill in your store page, upload capsule art, and submit for review.',
            '',
            'WHAT IS IN THIS FOLDER',
            '----------------------',
            sprintf('  %-24s the game', $executable),
            '  resources/app/           your game files (index.html, main.js)',
            '  upload_to_steam.bat      one click uploader',
            '  steam_build/             the generated Steam build scripts',
            '  STEAM-README.txt         this file',
            '',
            'The steam_build folder, the uploader and this readme are excluded from the',
            'depot, so they are not shipped to players.',
            '',
            'GOOD TO KNOW',
            '------------',
        ]);

        $lines[] = sprintf('  * %s keeps the default Electron icon and version details in', $executable);
        $lines[] = '    Windows file properties, because rewriting those needs rcedit, a Windows';
        $lines[] = '    only tool. The in-game window and taskbar icon do use your site icon.';
        $lines[] = '    To brand the executable itself, run rcedit on it after extracting.';
        $lines[] = '  * The executable is not code signed, so Windows SmartScreen may warn on';
        $lines[] = '    first launch outside Steam. Code signing is a separate purchase.';
        $lines[] = '  * Achievements, cloud saves and the Steam overlay need the Steamworks SDK';
        $lines[] = '    wired into resources/app/main.js and are not part of this build.';
        $lines[] = '  * Re-export and upload a new build whenever your game changes -- this';
        $lines[] = '    package is a snapshot of the game page at build time.';
        $lines[] = '';
        $lines[] = 'Steamworks docs:  https://partner.steamgames.com/doc/home';
        $lines[] = 'ContentBuilder:   https://partner.steamgames.com/doc/sdk/uploading';
        $lines[] = '';
        $lines[] = 'Electron is MIT licensed; see LICENSE and LICENSES.chromium.html here.';

        return implode("\r\n", $lines) . "\r\n";
    }

    /* ---------------------------------------------------------------------
     * Storage and output helpers.
     * ------------------------------------------------------------------ */

    /**
     * Create (once) and return the uploads directory holding the cached runtime.
     */
    private function getStorageDir(): string
    {
        $uploads = wp_upload_dir();

        if (!empty($uploads['error'])) {
            return '';
        }

        $directory = trailingslashit($uploads['basedir']) . self::STORAGE_DIR;

        if (!wp_mkdir_p($directory)) {
            return '';
        }

        $index = trailingslashit($directory) . 'index.php';

        if (!file_exists($index)) {
            $this->writeFile($index, "<?php\n// Silence is golden.\n");
        }

        $htaccess = trailingslashit($directory) . '.htaccess';

        if (!file_exists($htaccess)) {
            $this->writeFile($htaccess, "Deny from all\n");
        }

        return $directory;
    }

    /**
     * Move a file into place using the WordPress filesystem API.
     */
    private function moveFile(string $source, string $destination): bool
    {
        global $wp_filesystem;

        require_once ABSPATH . 'wp-admin/includes/file.php';

        if (!WP_Filesystem()) {
            return false;
        }

        return $wp_filesystem->move($source, $destination, true);
    }

    /**
     * Write a small file through the WordPress filesystem API.
     */
    private function writeFile(string $path, string $contents): void
    {
        global $wp_filesystem;

        require_once ABSPATH . 'wp-admin/includes/file.php';

        if (WP_Filesystem()) {
            $wp_filesystem->put_contents($path, $contents, FS_CHMOD_FILE);
        }
    }

    /**
     * Send a file to the browser in chunks, then delete it.
     */
    private function streamFile(string $path, string $filename): void
    {
        $size = filesize($path);

        // phpcs:ignore WordPress.WP.AlternativeFunctions -- streaming a large binary build, not a filesystem edit.
        $handle = fopen($path, 'rb');

        if (false === $handle) {
            wp_delete_file($path);
            $this->error(__('Could not read the generated build.', 'orbem-studio'));
        }

        while (ob_get_level() > 0) {
            ob_end_clean();
        }

        nocache_headers();
        header('Content-Type: application/zip');
        header('Content-Disposition: attachment; filename=' . $filename);

        if (false !== $size) {
            header('Content-Length: ' . $size);
        }

        while (!feof($handle)) {
            // phpcs:ignore WordPress.WP.AlternativeFunctions -- streaming a large binary build, not a filesystem edit.
            $chunk = fread($handle, self::STREAM_CHUNK);

            if (false === $chunk) {
                break;
            }

            // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- binary zip payload.
            echo $chunk;
            flush();
        }

        // phpcs:ignore WordPress.WP.AlternativeFunctions -- streaming a large binary build, not a filesystem edit.
        fclose($handle);
        wp_delete_file($path);
        exit;
    }

    /**
     * Redirect back to the export screen with an error message.
     */
    private function error(string $message): void
    {
        wp_safe_redirect(
            add_query_arg(
                'steam_error',
                rawurlencode($message),
                admin_url('admin.php?page=orbem-studio-export-import')
            )
        );
        exit;
    }
}
