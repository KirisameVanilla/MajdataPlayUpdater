using MajdataPlayUpdater;
using System.Net;
using System.Text.Json;

namespace MajdataPlayUpdater
{
    public partial class MainWindow : Form
    {
        public static HttpClient MyHttpClient { get; set; }
        public MainWindow()
        {
            InitializeComponent();
            Load += MainWindow_Loaded;
            MyHttpClient = new HttpClient();
        }
        public static void RecreateHttpClientWithProxy(string proxyUrl)
        {
            MyHttpClient?.Dispose();

            if (proxyUrl.Trim() == string.Empty)
            {
                MyHttpClient = new HttpClient();
            }
            else
            {
                var handler = new HttpClientHandler
                {
                    Proxy = new WebProxy(proxyUrl),
                    UseProxy = true
                };
                MyHttpClient = new HttpClient(handler);
            }
        }

        private const string BaseApiUrl = "https://kirisamevanilla.github.io/dev/";
        private VScrollBar _logScrollBar;


        private void MainWindow_Loaded(object? sender, EventArgs e)
        {
            _logScrollBar = GetScrollBar(txtLog);
        }

        private void DisableUiEvents()
        {
            btnPerformUpdate.Enabled = false;
            btnCheckUpdate.Enabled = false;
            btnGenerateJson.Enabled = false;
            btnEnsureProxy.Enabled = false;
            cmbReleaseType.Enabled = false;
            txtProxy.Enabled = false;
        }

        private void EnableUiEvents()
        {
            btnPerformUpdate.Enabled = true;
            btnCheckUpdate.Enabled = true;
            btnGenerateJson.Enabled = true;
            btnEnsureProxy.Enabled = true;
            cmbReleaseType.Enabled = true;
            txtProxy.Enabled = true;
        }

        private async void BtnPerformUpdate_Click(object sender, EventArgs e)
        {
            try
            {
                DisableUiEvents();

                progressBar.Style = ProgressBarStyle.Marquee; // Indeterminate state

                var releaseType = cmbReleaseType.SelectedItem?.ToString() ?? "Nightly";

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
                EnableUiEvents();
                progressBar.Style = ProgressBarStyle.Blocks; // Reset progress bar
            }
        }

        private async void BtnCheckUpdate_Click(object sender, EventArgs e)
        {
            try
            {
                DisableUiEvents();

                progressBar.Style = ProgressBarStyle.Marquee;

                var releaseType = cmbReleaseType.SelectedItem?.ToString() ?? "Nightly";

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
                EnableUiEvents();
                progressBar.Style = ProgressBarStyle.Blocks;
            }
        }

        private async void BtnGenerateJson_Click(object sender, EventArgs e)
        {
            try
            {
                DisableUiEvents();

                progressBar.Style = ProgressBarStyle.Marquee;

                var releaseType = cmbReleaseType.SelectedItem?.ToString() ?? "Nightly";
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
                EnableUiEvents();
                progressBar.Style = ProgressBarStyle.Blocks;
            }
        }

        private void TxtProxy_TextChanged(object sender, EventArgs e)
        {
            SetProxyHint.Visible = string.IsNullOrWhiteSpace(txtProxy.Text);
        }

        private void BtnEnsureProxy_Click(object sender, EventArgs e)
        {
            RecreateHttpClientWithProxy(txtProxy.Text);
            AddLog("代理设置切换为: " + (string.IsNullOrWhiteSpace(txtProxy.Text) ? "无代理" : txtProxy.Text));
        }

        private void OnLogMessageReceived(string message) => Invoke(new Action(() => AddLog(message)));

        private void AddLog(string message)
        {
            var isAtBottom = false;
            if (_logScrollBar != null)
            {
                isAtBottom = _logScrollBar.Value >= _logScrollBar.Maximum - _logScrollBar.LargeChange;
            }

            txtLog.AppendText($"[{DateTime.Now:HH:mm:ss}] {message}\r\n");

            if (isAtBottom && _logScrollBar != null)
            {
                txtLog.ScrollToCaret();
            }
        }

        private static VScrollBar? GetScrollBar(Control ctrl)
        {
            foreach (Control child in ctrl.Controls)
            {
                if (child is VScrollBar scrollBar)
                {
                    return scrollBar;
                }
            }
            return null;
        }

        private async Task<string> FetchUpdateInfoAsync(string releaseType)
        {
            AddLog($"正在获取 {releaseType} 版本信息...");
            try
            {
                return await MyHttpClient.GetStringAsync($"{BaseApiUrl}{releaseType}.json");
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
}
