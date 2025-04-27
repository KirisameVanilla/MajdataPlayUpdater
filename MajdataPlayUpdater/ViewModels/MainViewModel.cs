using MajdataPlayUpdater.Models;
using System;

namespace MajdataPlayUpdater.ViewModels;

public class MainViewModel : ViewModelBase
{
    public HttpHelper HttpHelper = new();

    public string GetDownloadUrl(string releaseType)
    {
        return releaseType.ToLower() switch
        {
            "nightly" => "https://majdataplay-distrib.work/Nightly",
            "stable" => "https://majdataplay-distrib.work/Stable",
            _ => throw new ArgumentException("无效的版本类型")
        };
    }
}
