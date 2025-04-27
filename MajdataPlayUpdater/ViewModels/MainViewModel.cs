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
            "nightly" => "https://kirisamevanilla.github.io/dev/publish",
            "stable" => "https://your-cdn.com/stable",
            _ => throw new ArgumentException("无效的版本类型")
        };
    }
}
