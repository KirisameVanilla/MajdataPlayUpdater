using Newtonsoft.Json;
using System.IO;
using System.Net.Http;
using System.Security.Cryptography;

namespace MajdataPlayUpdater;

public class UpdateManager(string apiResponse, string baseLocalPath, string baseDownloadUrl)
{
    public event Action<string> LogMessage;
    private List<AssetInfo>? assets = JsonConvert.DeserializeObject<List<AssetInfo>>(apiResponse);

    public async Task PerformUpdateAsync()
    {
        LogMessage?.Invoke($"开始处理版本更新");

        foreach (var asset in assets)
        {
            await ProcessAssetAsync(asset);
        }

        LogMessage?.Invoke("更新处理完成");
    }

    public async Task CheckUpdateAsync()
    {
        LogMessage?.Invoke($"开始检查版本更新");

        await Task.Run(() =>
        {
            if (assets.Any(CheckAsset))
            {
                LogMessage?.Invoke("有更新");
            }
        });

        LogMessage?.Invoke("更新检查完成");
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
            LogMessage?.Invoke($"文件哈希不匹配: {localFilePath} - 将更新");
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

        return !string.Equals(localHash, asset.SHA256, StringComparison.OrdinalIgnoreCase); 
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

            using (var response = await App.HttpClient.GetAsync(url, HttpCompletionOption.ResponseHeadersRead))
            {
                response.EnsureSuccessStatusCode();

                await using var contentStream = await response.Content.ReadAsStreamAsync();
                await using var fileStream = new FileStream(destinationPath + ".tmp", FileMode.Create);
                await contentStream.CopyToAsync(fileStream);
            }

            var downloadedHash = CalculateFileHash(destinationPath + ".tmp");

            if (!string.Equals(downloadedHash, expectedHash, StringComparison.OrdinalIgnoreCase))
            {
                if (destinationPath.EndsWith(".json"))
                    LogMessage?.Invoke($"下载错误, 文件哈希不匹配: {destinationPath}, 但是是Json文件, 可能是换行空格等格式导致的, 因此不处理本错误");
                else
                    throw new Exception($"下载错误, 文件哈希不匹配: {destinationPath}, 下载哈希: {downloadedHash}, 期待哈希: {expectedHash}");
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
