using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Avalonia;
using Avalonia.Controls;
using Avalonia.Input;
using Avalonia.Interactivity;
using Avalonia.Platform.Storage;
using Avalonia.Threading;
using Avalonia.VisualTree;
using MajdataPlayUpdater.Models;
using MajdataPlayUpdater.ViewModels;

namespace MajdataPlayUpdater.Views;

public partial class UpdaterView : UserControl
{
    private const int VersionCode = 1;
    private readonly UpdateManager updater = new();
    private ScrollViewer? _logScrollViewer;

    public UpdaterView()
    {
        InitializeComponent();
        Loaded += MainWindow_Loaded;
        DataContext = new UpdaterViewModel();
        SettingsManager.Load();
        TxtMajdataPath.Text = SettingsManager.Settings.LastOpenedFolder;
        OnSwitchBack();

        updater.SetBaseLocalPath(SettingsManager.Settings.LastOpenedFolder);
        updater.LogMessage += OnLogMessageReceived;
        CheckVersion();
    }

    public void OnSwitchBack()
    {
        ViewModel.HttpHelper.RecreateHttpClientWithProxy(SettingsManager.Settings.ProxyUrl);

        updater.SetHttpHelper(ViewModel.HttpHelper);
        if (!string.IsNullOrEmpty(SettingsManager.Settings.ProxyUrl.Trim()))
            AddLog("当前代理为: " + SettingsManager.Settings.ProxyUrl);
        else
            AddLog("当前无代理");
    }

    private UpdaterViewModel ViewModel => DataContext as UpdaterViewModel ?? new UpdaterViewModel();

    private void MainWindow_Loaded(object? sender, RoutedEventArgs e)
    {
        _logScrollViewer = GetScrollViewer(TxtLog);
    }

    private async Task CheckVersion()
    {
        var versionJson =
            await ViewModel.HttpHelper.Client.GetStringAsync(
                "https://majdataplay-distrib.work/MajdataPlayUpdaterVersion.json");
        using var doc = JsonDocument.Parse(versionJson);

        var versionCode = doc.RootElement.GetProperty("VersionCode").GetInt32();
        var changelog = doc.RootElement.GetProperty("Changelog").GetString() ?? string.Empty;
        if (versionCode != VersionCode)
        {
            var dialog = new Dialog("本体有更新！！", changelog);
            await dialog.ShowDialog(VisualRoot as Window);
        }
    }

    private void DisableUiEvents()
    {
        BtnPerformUpdate.IsEnabled = false;
        BtnCheckUpdate.IsEnabled = false;
        BtnGenerateJson.IsEnabled = false;
        CmbReleaseType.IsEnabled = false;
        TxtMajdataPath.IsEnabled = false;

        ProgressBar.IsIndeterminate = true;
    }

    private void EnableUiEvents()
    {
        BtnPerformUpdate.IsEnabled = true;
        BtnCheckUpdate.IsEnabled = true;
        BtnGenerateJson.IsEnabled = true;
        CmbReleaseType.IsEnabled = true;
        TxtMajdataPath.IsEnabled = true;

        ProgressBar.IsIndeterminate = false;
    }

    private async void BtnPerformUpdate_Click(object sender, RoutedEventArgs e)
    {
        try
        {
            DisableUiEvents();

            var releaseType = (CmbReleaseType.SelectedItem as ComboBoxItem)?.Content?.ToString() ?? "Nightly";

            var apiResponse = await FetchUpdateInfoAsync(releaseType);

            updater.SetAssets(apiResponse);
            updater.SetBaseDownloadUrl(ViewModel.GetDownloadUrl(releaseType));

            await Task.Run(updater.PerformUpdateAsync);
        }
        catch (Exception ex)
        {
            AddLog($"错误: {ex.Message}");
        }
        finally
        {
            EnableUiEvents();
        }
    }

    private async void BtnCheckUpdate_Click(object sender, RoutedEventArgs e)
    {
        try
        {
            DisableUiEvents();

            var releaseType = (CmbReleaseType.SelectedItem as ComboBoxItem)?.Content?.ToString() ?? "Nightly";

            var apiResponse = await FetchUpdateInfoAsync(releaseType);

            updater.SetAssets(apiResponse);
            updater.SetBaseDownloadUrl(ViewModel.GetDownloadUrl(releaseType));

            await Task.Run(updater.CheckUpdateAsync);
        }
        catch (Exception ex)
        {
            AddLog($"错误: {ex.Message}");
        }
        finally
        {
            EnableUiEvents();
        }
    }

    private async void BtnGenerateJson_Click(object sender, RoutedEventArgs e)
    {
        try
        {
            DisableUiEvents();

            var releaseType = (CmbReleaseType.SelectedItem as ComboBoxItem)?.Content?.ToString() ?? "Nightly";
            var rootPath = SettingsManager.Settings.LastOpenedFolder;
            var assets = new List<AssetInfo>();

            await Task.Run(() =>
            {
                foreach (var file in Directory.GetFiles(rootPath, "*", SearchOption.AllDirectories))
                {
                    var relativePath = Path.GetRelativePath(rootPath, file).Replace("\\", "/");
                    if (relativePath is "Nightly.json" or "Stable.json" or "MajdataPlayUpdater.Desktop.exe")
                        continue; // 跳过

                    var sha256 = UpdateManager.CalculateFileHash(file);

                    lock (assets)
                    {
                        assets.Add(new AssetInfo
                        {
                            Name = Path.GetFileName(file),
                            SHA256 = sha256,
                            RelativePath = "/" + relativePath
                        });
                    }
                }
            });

            var json = JsonSerializer.Serialize(assets, JsonContext.IndentedOptions);

            await Task.Run(() => File.WriteAllText(Path.Combine(rootPath, $"{releaseType}.json"), json));

            AddLog("生成完毕！");
        }
        catch (Exception ex)
        {
            AddLog($"错误: {ex.Message}");
        }
        finally
        {
            EnableUiEvents();
        }
    }

    private void OnLogMessageReceived(string message)
    {
        Dispatcher.UIThread.Post(() => AddLog(message));
    }

    private void AddLog(string message)
    {
        if (TxtLog == null)
            return;

        var isAtBottom = false;

        if (_logScrollViewer != null)
            isAtBottom = _logScrollViewer.Offset.Y >=
                         _logScrollViewer.Extent.Height - _logScrollViewer.Viewport.Height - 5;

        TxtLog.Text += $"[{DateTime.Now:HH:mm:ss}] {message}\n";

        if (isAtBottom && _logScrollViewer != null)
            _logScrollViewer.Offset = new Vector(0, _logScrollViewer.Extent.Height);
    }


    private static ScrollViewer? GetScrollViewer(Visual visual)
    {
        if (visual is ScrollViewer viewer)
            return viewer;

        foreach (var child in visual.GetVisualChildren())
        {
            var result = GetScrollViewer(child);
            if (result != null)
                return result;
        }

        return null;
    }

    private async Task<string> FetchUpdateInfoAsync(string releaseType)
    {
        AddLog($"正在获取 {releaseType} 版本信息...");
        try
        {
            return await ViewModel.HttpHelper.Client.GetStringAsync($"{SettingsManager.Settings.HashJsonEndPoint}{releaseType}.json");
        }
        catch (HttpRequestException ex)
        {
            AddLog($"API请求失败: {ex.StatusCode} - {ex.Message}");
            throw;
        }
    }

    private async void BtnSelectMajdataPath_OnClickAsync(object? sender, RoutedEventArgs e)
    {
        var window = this.GetVisualRoot() as Window;
        var storageProvider = window?.StorageProvider;

        if (storageProvider?.CanPickFolder ?? false)
        {
            var folder = await storageProvider.OpenFolderPickerAsync(new FolderPickerOpenOptions
            {
                Title = "请选择MajdataPlay.exe根目录",
                AllowMultiple = false
            });

            if (folder != null && folder.Count > 0)
            {
                TxtMajdataPath.Text = folder[0].Path.LocalPath;
                SettingsManager.Settings.LastOpenedFolder = folder[0].Path.LocalPath;
                SettingsManager.Save();
                updater.SetBaseLocalPath(SettingsManager.Settings.LastOpenedFolder);
            }
        }
        else
        {
            AddLog("不允许选择文件夹");
        }
    }
}