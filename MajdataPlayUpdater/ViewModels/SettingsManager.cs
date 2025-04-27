using System;
using System.IO;
using System.Text.Json;
using MajdataPlayUpdater.Models;

namespace MajdataPlayUpdater.ViewModels;

public static class SettingsManager
{
    private static readonly string SettingsFilePath = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
        "MajdataPlayUpdater",
        "settings.json");

    public static Settings Settings { get; private set; } = new Settings();

    public static void Load()
    {
        try
        {
            if (File.Exists(SettingsFilePath))
            {
                var json = File.ReadAllText(SettingsFilePath);
                Settings = JsonSerializer.Deserialize<Settings>(json, JsonContext.IndentedOptions) ?? new Settings();
            }
        }
        catch
        {
            Settings = new Settings();
        }
    }

    public static void Save()
    {
        try
        {
            var directory = Path.GetDirectoryName(SettingsFilePath);
            if (!Directory.Exists(directory))
            {
                Directory.CreateDirectory(directory!);
            }

            var json = JsonSerializer.Serialize(Settings, JsonContext.IndentedOptions);
            File.WriteAllText(SettingsFilePath, json);
        }
        catch
        {
            
        }
    }
}
