using System.Security.Cryptography;
using System.Text.Json;

namespace MajdataPlayUpdater;

public class UpdateManager(string apiResponse, string baseLocalPath, string baseDownloadUrl)
{
    public event Action<string>? LogMessage;
    private readonly List<AssetInfo>? _assets = JsonSerializer.Deserialize<List<AssetInfo>>(apiResponse, new JsonSerializerOptions
    {
        PropertyNameCaseInsensitive = true
    });

    public async Task PerformUpdateAsync()
    {
        if (_assets == null)
        {
            LogMessage?.Invoke("服务器返回为空, 请稍后重试或检查网络环境");
            return;
        }

        LogMessage?.Invoke("开始处理版本更新");

        foreach (var asset in _assets)
        {
            await ProcessAssetAsync(asset);
        }

        LogMessage?.Invoke("更新处理完成");
    }

    public async Task CheckUpdateAsync()
    {
        if (_assets == null)
        {
            LogMessage?.Invoke("服务器返回为空, 请稍后重试或检查网络环境");
            return;
        }

        LogMessage?.Invoke("开始检查版本更新");

        await Task.Run(() =>
        {
            LogMessage?.Invoke(_assets.Any(CheckAsset) ? "有更新" : "无更新 (不检测文本文件, 如游戏运行有问题请当作有更新)");
        });
    }

    private async Task ProcessAssetAsync(AssetInfo asset)
    {
        var localFilePath = Path.Combine(baseLocalPath, asset.RelativePath.TrimStart('/'));
        var downloadUrl = baseDownloadUrl + asset.RelativePath;

        if (!File.Exists(localFilePath))
        {
            LogMessage?.Invoke($"文件不存在: {localFilePath} - 将下载");
            await DownloadFileAsync(downloadUrl, localFilePath, asset.SHA256);
            return;
        }

        var localHash = CalculateFileHash(localFilePath);

        if (!string.Equals(localHash, asset.SHA256, StringComparison.OrdinalIgnoreCase))
        {
            LogMessage?.Invoke($"文件并非最新: {localFilePath} - 将更新");
            await DownloadFileAsync(downloadUrl, localFilePath, asset.SHA256);
        }
        else
        {
            LogMessage?.Invoke($"文件已验证: {localFilePath} - 无需更新");
        }
    }

    private bool CheckAsset(AssetInfo asset)
    {
        var localFilePath = Path.Combine(baseLocalPath, asset.RelativePath.TrimStart('/'));

        if (!File.Exists(localFilePath))
        {
            return true;
        }

        var localHash = CalculateFileHash(localFilePath);

        return !(localFilePath.EndsWith(".json") || localFilePath.EndsWith(".meta") || localFilePath.EndsWith(".browser")) && !string.Equals(localHash, asset.SHA256, StringComparison.OrdinalIgnoreCase);
    }

    public static string CalculateFileHash(string filePath)
    {
        using var sha256 = SHA256.Create();
        using var stream = File.OpenRead(filePath);
        var hashBytes = sha256.ComputeHash(stream);
        return BitConverter.ToString(hashBytes).Replace("-", "").ToLowerInvariant();
    }

    private async Task DownloadFileAsync(string url, string destinationPath, string expectedHash)
    {
        try
        {
            Directory.CreateDirectory(Path.GetDirectoryName(destinationPath));

            using (var response = await MainWindow.MyHttpClient.GetAsync(url, HttpCompletionOption.ResponseHeadersRead))
            {
                response.EnsureSuccessStatusCode();

                await using var contentStream = await response.Content.ReadAsStreamAsync();
                await using var fileStream = new FileStream(destinationPath + ".tmp", FileMode.Create);
                await contentStream.CopyToAsync(fileStream);
            }

            var downloadedHash = CalculateFileHash(destinationPath + ".tmp");

            if (!string.Equals(downloadedHash, expectedHash, StringComparison.OrdinalIgnoreCase))
            {
                if (destinationPath.EndsWith(".json") || destinationPath.EndsWith(".meta") || destinationPath.EndsWith(".browser"))
                    LogMessage?.Invoke($"警告: 下载文件哈希不匹配: {destinationPath}, 但是是文本文件, 可能是换行空格等格式导致的, 因此不处理本错误");
                //TODO: 对于json和meta采用其他方式判断是否一致
                else
                    throw new Exception($"错误: 下载文件哈希不匹配: {destinationPath}");
            }

            if (File.Exists(destinationPath))
                File.Delete(destinationPath);

            File.Move(destinationPath + ".tmp", destinationPath);
        }
        catch (Exception ex)
        {
            LogMessage?.Invoke($"下载失败: {url} - {ex.Message}");
            throw;
        }
    }
}
