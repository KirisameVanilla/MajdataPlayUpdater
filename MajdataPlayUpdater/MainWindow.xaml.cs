using System.IO;
using System.Net.Http;
using System.Text.Json;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;

namespace MajdataPlayUpdater;

/// <summary>
/// Interaction logic for MainWindow.xaml
/// </summary>
public partial class MainWindow : Window
{
    private const string BaseApiUrl = "https://kirisamevanilla.github.io/dev/";
    private ScrollViewer? _logScrollViewer;

    public MainWindow()
    {
        InitializeComponent();
        Loaded += MainWindow_Loaded;
    }

    private void MainWindow_Loaded(object sender, RoutedEventArgs e)
    {
        _logScrollViewer = GetScrollViewer(txtLog);
    }

    private async void BtnPerformUpdate_Click(object sender, RoutedEventArgs e)
    {
        try
        {
            btnPerformUpdate.IsEnabled = false;
            progressBar.IsIndeterminate = true;

            var releaseType = ((ComboBoxItem)cmbReleaseType.SelectedItem).Content.ToString() ?? "Nightly";

            var apiResponse = await FetchUpdateInfoAsync(releaseType);

            var updater = new UpdateManager(apiResponse, AppDomain.CurrentDomain.BaseDirectory, GetDownloadUrl(releaseType));
            updater.LogMessage += OnLogMessageReceived;
            await Task.Run(updater.PerformUpdateAsync);
        }
        catch (Exception ex)
        {
            AddLog($"错误: {ex.Message}");
        }
        finally
        {
            btnPerformUpdate.IsEnabled = true;
            progressBar.IsIndeterminate = false;
        }
    }

    private async void BtnCheckUpdate_Click(object sender, RoutedEventArgs e)
    {
        try
        {
            btnCheckUpdate.IsEnabled = false;
            progressBar.IsIndeterminate = true;

            var releaseType = ((ComboBoxItem)cmbReleaseType.SelectedItem).Content.ToString() ?? "Nightly";

            var apiResponse = await FetchUpdateInfoAsync(releaseType);

            var updater = new UpdateManager(apiResponse, AppDomain.CurrentDomain.BaseDirectory, GetDownloadUrl(releaseType));
            updater.LogMessage += OnLogMessageReceived;
            await Task.Run(updater.CheckUpdateAsync);
        }
        catch (Exception ex)
        {
            AddLog($"错误: {ex.Message}");
        }
        finally
        {
            btnCheckUpdate.IsEnabled = true;
            progressBar.IsIndeterminate = false;
        }
    }

    private async void BtnGenerateJson_Click(object sender, RoutedEventArgs e)
    {
        try
        {
            btnGenerateJson.IsEnabled = false;
            progressBar.IsIndeterminate = true;

            var releaseType = ((ComboBoxItem)cmbReleaseType.SelectedItem).Content.ToString() ?? "Nightly";
            var rootPath = AppDomain.CurrentDomain.BaseDirectory;
            var assets = new List<AssetInfo>();

            await Task.Run(() =>
            {
                foreach (var file in Directory.GetFiles(rootPath, "*", SearchOption.AllDirectories))
                {
                    var relativePath = Path.GetRelativePath(rootPath, file).Replace("\\", "/");
                    if (relativePath == "Nightly.json" || relativePath == "Stable.json" || relativePath.Contains("MajdataPlayUpdater")) continue; // 跳过

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

            var json = JsonSerializer.Serialize(assets, new JsonSerializerOptions
            {
                WriteIndented = true
            });

            await Task.Run(() => File.WriteAllText(Path.Combine(rootPath, $"{releaseType}.json"), json));

            AddLog("生成完毕！");
        }
        catch (Exception ex)
        {
            AddLog($"错误: {ex.Message}");
        }
        finally
        {
            btnGenerateJson.IsEnabled = true;
            progressBar.IsIndeterminate = false;
        }
    }

    private void TxtProxy_TextChanged(object sender, TextChangedEventArgs e) => SetProxyHint.Visibility =
        txtProxy.Text.Trim() == string.Empty ? Visibility.Visible : Visibility.Collapsed;

    private void BtnEnsureProxy_Click(object sender, RoutedEventArgs e)
    {
        App.RecreateHttpClientWithProxy(txtProxy.Text);
        AddLog("代理设置切换为: " + (txtProxy.Text.Trim() == string.Empty ? "无代理" : txtProxy.Text));
    }

    private void OnLogMessageReceived(string message) => Dispatcher.Invoke(() => AddLog(message));

    private void AddLog(string message)
    {
        bool isAtBottom = false;
        if (_logScrollViewer != null)
        {
            isAtBottom = _logScrollViewer.VerticalOffset >= _logScrollViewer.ScrollableHeight - 5;
        }

        txtLog.AppendText($"[{DateTime.Now:HH:mm:ss}] {message}\n");

        if (isAtBottom && _logScrollViewer != null)
        {
            txtLog.ScrollToEnd();
        }
    }

    private static ScrollViewer? GetScrollViewer(DependencyObject depObj)
    {
        if (depObj is ScrollViewer viewer) return viewer;

        for (var i = 0; i < VisualTreeHelper.GetChildrenCount(depObj); i++)
        {
            var child = VisualTreeHelper.GetChild(depObj, i);
            var result = GetScrollViewer(child);
            if (result != null) return result;
        }
        return null;
    }

    private async Task<string> FetchUpdateInfoAsync(string releaseType)
    {
        AddLog($"正在获取 {releaseType} 版本信息...");
        try
        {
            return await App.HttpClient.GetStringAsync($"{BaseApiUrl}{releaseType}.json");
        }
        catch (HttpRequestException ex)
        {
            AddLog($"API请求失败: {ex.StatusCode} - {ex.Message}");
            throw;
        }
    }

    private string GetDownloadUrl(string releaseType)
    {
        return releaseType.ToLower() switch
        {
            "nightly" => "https://kirisamevanilla.github.io/dev/publish",
            "stable" => "https://your-cdn.com/stable",
            _ => throw new ArgumentException("无效的版本类型")
        };
    }
}