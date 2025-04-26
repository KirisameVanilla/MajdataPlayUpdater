using System.Net.Http;
using System.Windows;
using System.Windows.Controls;

namespace MajdataPlayUpdater;

/// <summary>
/// Interaction logic for MainWindow.xaml
/// </summary>
public partial class MainWindow : Window
{
    private const string BaseLocalPath = @"C:\YourApp";
    private const string BaseApiUrl = "https://your-api.com/update?type=";

    public MainWindow()
    {
        InitializeComponent();
    }

    private async void BtnCheckUpdate_Click(object sender, RoutedEventArgs e)
    {
        try
        {
            btnCheckUpdate.IsEnabled = false;
            progressBar.IsIndeterminate = true;

            // 获取选择的版本类型
            var releaseType = ((ComboBoxItem)cmbReleaseType.SelectedItem).Content.ToString() ?? "Nightly";

            // 从API获取更新信息
            var apiResponse = await FetchUpdateInfoAsync(releaseType);

            // 执行更新
            var updater = new UpdateManager(apiResponse, BaseLocalPath, GetDownloadUrl(releaseType));
            updater.LogMessage += OnLogMessageReceived;
            await updater.PerformUpdateAsync();
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

    private void OnLogMessageReceived(string message)
    {
        Dispatcher.Invoke(() => AddLog(message));
    }

    private void AddLog(string message)
    {
        txtLog.AppendText($"[{DateTime.Now:HH:mm:ss}] {message}\n");
        txtLog.ScrollToEnd();
    }

    private async Task<string> FetchUpdateInfoAsync(string releaseType)
    {
        AddLog($"正在获取 {releaseType} 版本信息...");
        try
        {
            return await App.HttpClient.GetStringAsync($"{BaseApiUrl}{releaseType}");
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
            "nightly" => "https://your-cdn.com/nightly",
            "stable" => "https://your-cdn.com/stable",
            _ => throw new ArgumentException("无效的版本类型")
        };
    }
}