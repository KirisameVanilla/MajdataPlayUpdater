using System;

namespace MajdataPlayUpdater.Models;
public class Settings
{
    public string LastOpenedFolder { get; set; } = AppDomain.CurrentDomain.BaseDirectory;
    public string ProxyUrl { get; set; } = "";
}