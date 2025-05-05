using System;
using MajdataPlayUpdater.Models;

namespace MajdataPlayUpdater.ViewModels;

public class UpdaterViewModel : ViewModelBase
{
    public HttpHelper HttpHelper = new();

    public string GetDownloadUrl(string releaseType)
    {
        return releaseType.ToLower() switch
        {
            "nightly" => SettingsManager.Settings.DownloadEndPoint + "Nightly",
            "stable" => SettingsManager.Settings.DownloadEndPoint + "Stable",
            _ => throw new ArgumentException("无效的版本类型")
        };
    }
}