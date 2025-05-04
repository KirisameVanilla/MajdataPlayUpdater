using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace MajdataPlayUpdater.Models;

public class UpdateManager
{
    private List<AssetInfo>? _assets;
    private HashSet<AssetInfo> _assetsOutdated = [];
    private string? _baseDownloadUrl;
    private string? _baseLocalPath;
    private HttpHelper? _httpHelper;
    private readonly HashSet<AssetInfo> _textFiles = [];
    private bool check;
    public event Action<string>? LogMessage;

    public void SetAssets(string apiResponse)
    {
        _assets = JsonSerializer.Deserialize<List<AssetInfo>>(apiResponse, JsonContext.IndentedOptions);
    }

    public void SetHttpHelper(HttpHelper httpHelper)
    {
        _httpHelper = httpHelper;
    }

    public void SetBaseLocalPath(string baseLocalPath)
    {
        _baseLocalPath = baseLocalPath;
    }

    public void SetBaseDownloadUrl(string baseDownloadUrl)
    {
        _baseDownloadUrl = baseDownloadUrl;
    }

    public async Task PerformUpdateAsync()
    {
        if (_assets == null)
        {
            LogMessage?.Invoke("服务器返回为空, 请稍后重试或检查网络环境");
            return;
        }

        LogMessage?.Invoke("开始处理版本更新");

        if (!check)
            _assetsOutdated = _assets.Where(CheckAsset).ToHashSet();

        var assetsNeedUpdate = new HashSet<AssetInfo>(_assetsOutdated);
        assetsNeedUpdate.UnionWith(_textFiles);
        if (assetsNeedUpdate.Count <= 10)
            foreach (var a in assetsNeedUpdate)
                LogMessage?.Invoke(a.Name);

        _assetsOutdated.Clear();
        _textFiles.Clear();
        check = false;

        // 控制最大并发数
        using var semaphore = new SemaphoreSlim(5);

        var tasks = assetsNeedUpdate.Select(async asset =>
        {
            await semaphore.WaitAsync();
            try
            {
                await ProcessAssetAsync(asset);
            }
            catch (Exception ex)
            {
                LogMessage?.Invoke($"处理文件时出错: {asset.RelativePath} - {ex.Message}");
            }
            finally
            {
                semaphore.Release();
            }
        });

        await Task.WhenAll(tasks);

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
            _assetsOutdated = _assets.Where(CheckAsset).ToHashSet();
            LogMessage?.Invoke(_assetsOutdated.Count != 0
                ? $"有更新, 预计需要更新 {_assetsOutdated.Count} 个文件"
                : "无更新 (不检测文本文件, 如游戏运行有问题请当作有更新)");
            check = true;
        });
    }

    private async Task ProcessAssetAsync(AssetInfo asset)
    {
        var localFilePath = Path.Combine(_baseLocalPath, asset.RelativePath.TrimStart('/'));
        var downloadUrl = _baseDownloadUrl + asset.RelativePath;

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
    }

    // 返回值: 是否需要更新
    // 如果不是文本文件 并且哈希不同那么需要更新
    private bool CheckAsset(AssetInfo asset)
    {
        var localFilePath = Path.Combine(_baseLocalPath, asset.RelativePath.TrimStart('/'));

        if (!File.Exists(localFilePath)) return true;

        var localHash = CalculateFileHash(localFilePath);
        var isTextFile = localFilePath.EndsWith(".json") || localFilePath.EndsWith(".meta") ||
                         localFilePath.EndsWith(".browser");

        // 如果是文本文件，且哈希不同。用于强制更新文本文件；如果哈希相同就不管了^ ^
        if (isTextFile && !string.Equals(localHash, asset.SHA256, StringComparison.OrdinalIgnoreCase))
            _textFiles.Add(asset);

        return !isTextFile && !string.Equals(localHash, asset.SHA256, StringComparison.OrdinalIgnoreCase);
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
            var directoryName = Path.GetDirectoryName(destinationPath);
            if (directoryName == null)
            {
                LogMessage?.Invoke($"从{destinationPath}获取目录名失败");
                return;
            }

            Directory.CreateDirectory(directoryName);

            using (var response = await _httpHelper.Client.GetAsync(url, HttpCompletionOption.ResponseHeadersRead))
            {
                response.EnsureSuccessStatusCode();

                await using var contentStream = await response.Content.ReadAsStreamAsync();
                await using var fileStream = new FileStream(destinationPath + ".tmp", FileMode.Create);
                await contentStream.CopyToAsync(fileStream);
            }

            var downloadedHash = CalculateFileHash(destinationPath + ".tmp");

            if (!string.Equals(downloadedHash, expectedHash, StringComparison.OrdinalIgnoreCase))
            {
                if (destinationPath.EndsWith(".json") || destinationPath.EndsWith(".meta") ||
                    destinationPath.EndsWith(".browser"))
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