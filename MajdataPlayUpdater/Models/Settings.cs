using System;

namespace MajdataPlayUpdater.Models;

public class Settings
{
    public string LastOpenedFolder { get; set; } = AppDomain.CurrentDomain.BaseDirectory;
    public string ProxyUrl { get; set; } = "";
    public string HashJsonEndPoint { get; set; } = "https://ghproxy.vanillaaaa.org/https://raw.githubusercontent.com/TeamMajdata/MajdataPlay_Build/refs/heads/master/";
    public string DownloadEndPoint { get; set; } = "https://ghproxy.vanillaaaa.org/https://raw.githubusercontent.com/TeamMajdata/MajdataPlay_Build/refs/heads/master/";
}