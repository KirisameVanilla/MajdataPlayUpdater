using System;

namespace MajdataPlayUpdater.Models;

public class Settings
{
    public string LastOpenedFolder { get; set; } = AppDomain.CurrentDomain.BaseDirectory;
    public string ProxyUrl { get; set; } = "";
    public string HashJsonEndPoint { get; set; } = "https://majdataplay-distrib.work/";
    public string DownloadEndPoint { get; set; } = "https://majdataplay-distrib.work/";
}