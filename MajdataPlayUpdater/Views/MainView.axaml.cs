using Avalonia;
using Avalonia.Controls;
using Avalonia.Input;
using Avalonia.Interactivity;
using Avalonia.Platform.Storage;
using Avalonia.Threading;
using Avalonia.VisualTree;
using MajdataPlayUpdater.Models;
using MajdataPlayUpdater.ViewModels;
using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;

namespace MajdataPlayUpdater.Views;

public partial class MainView : UserControl
{
    private const string BaseApiUrl = "https://majdataplay-distrib.work/";
    private ScrollViewer? _logScrollViewer;
    private MainViewModel ViewModel => DataContext as MainViewModel ?? new MainViewModel();
    public MainView()
    {
        InitializeComponent();
        Loaded += MainWindow_Loaded;
        DataContext = new MainViewModel();
        SettingsManager.Load();
        TxtProxy.Text = SettingsManager.Settings.ProxyUrl;
        TxtMajdataPath.Text = SettingsManager.Settings.LastOpenedFolder;
        ViewModel.HttpHelper.RecreateHttpClientWithProxy(SettingsManager.Settings.ProxyUrl);
        SetProxyHint.IsVisible = SettingsManager.Settings.ProxyUrl == string.Empty;
    }

    private void MainWindow_Loaded(object? sender, RoutedEventArgs e)
    {
        _logScrollViewer = GetScrollViewer(TxtLog);
    }

    private void DisableUiEvents()
    {
        BtnPerformUpdate.IsEnabled = false;
        BtnCheckUpdate.IsEnabled = false;
        BtnGenerateJson.IsEnabled = false;
        BtnEnsureProxy.IsEnabled = false;
        CmbReleaseType.IsEnabled = false;
        TxtProxy.IsEnabled = false;
        TxtMajdataPath.IsEnabled = false;

        ProgressBar.IsIndeterminate = true;
    }

    private void EnableUiEvents()
    {
        BtnPerformUpdate.IsEnabled = true;
        BtnCheckUpdate.IsEnabled = true;
        BtnGenerateJson.IsEnabled = true;
        BtnEnsureProxy.IsEnabled = true;
        CmbReleaseType.IsEnabled = true;
        TxtProxy.IsEnabled = true;
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

            var updater = new UpdateManager(apiResponse, SettingsManager.Settings.LastOpenedFolder, ViewModel.GetDownloadUrl(releaseType), ViewModel.HttpHelper);
            updater.LogMessage += OnLogMessageReceived;
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

            var updater = new UpdateManager(apiResponse, SettingsManager.Settings.LastOpenedFolder, ViewModel.GetDownloadUrl(releaseType), ViewModel.HttpHelper);
            updater.LogMessage += OnLogMessageReceived;
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
                    if (relativePath is "Nightly.json" or "Stable.json" or "MajdataPlayUpdater.Desktop.exe" or "libSkiaSharp.dll" or "libHarfBuzzSharp.dll" or "av_libglesv2.dll") continue; // 跳过

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

    private void BtnEnsureProxy_Click(object sender, RoutedEventArgs e)
    {
        var proxyUrl = TxtProxy.Text?.Trim() ?? string.Empty;
        SettingsManager.Settings.ProxyUrl = proxyUrl;
        SettingsManager.Save();
        ViewModel.HttpHelper.RecreateHttpClientWithProxy(proxyUrl);
        AddLog("代理设置切换为: " + (proxyUrl == string.Empty ? "无代理" : proxyUrl));
    }

    private void OnLogMessageReceived(string message) => Dispatcher.UIThread.Post(() => AddLog(message));

    private void AddLog(string message)
    {
        if (TxtLog == null)
            return;

        bool isAtBottom = false;

        if (_logScrollViewer != null)
        {
            isAtBottom = _logScrollViewer.Offset.Y >= _logScrollViewer.Extent.Height - _logScrollViewer.Viewport.Height - 5;
        }

        TxtLog.Text += $"[{DateTime.Now:HH:mm:ss}] {message}\n";

        if (isAtBottom && _logScrollViewer != null)
        {
            _logScrollViewer.Offset = new Vector(0, _logScrollViewer.Extent.Height);
        }
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
            return await ViewModel.HttpHelper.Client.GetStringAsync($"{BaseApiUrl}{releaseType}.json");
        }
        catch (HttpRequestException ex)
        {
            AddLog($"API请求失败: {ex.StatusCode} - {ex.Message}");
            throw;
        }
    }

    private void TxtProxy_OnLostFocus(object? sender, RoutedEventArgs e) => SetProxyHint.IsVisible = (TxtProxy.Text?.Trim() ?? string.Empty) == string.Empty;

    private void TxtProxy_OnGotFocusGotFocus(object? sender, GotFocusEventArgs e) => SetProxyHint.IsVisible = false;

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
            }
        }
        else
        {
            AddLog("不允许选择文件夹");
        }
    }
}
