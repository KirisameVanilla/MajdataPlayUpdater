using System.Text.Json.Serialization;

namespace MajdataPlayUpdater;

public class AssetInfo
{
    [JsonPropertyName(nameof(Name))]
    public required string Name { get; set; }

    [JsonPropertyName(nameof(SHA256))]
    public required string SHA256 { get; set; }

    [JsonPropertyName(nameof(RelativePath))]
    public required string RelativePath { get; set; }
}