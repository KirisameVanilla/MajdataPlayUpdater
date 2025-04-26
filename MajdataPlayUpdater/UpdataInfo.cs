using Newtonsoft.Json;

namespace MajdataPlayUpdater;

public class AssetInfo
{
    [JsonProperty(nameof(Name))]
    public required string Name { get; set; }

    [JsonProperty(nameof(SHA256))]
    public required string SHA256 { get; set; }

    [JsonProperty(nameof(RelativePath))]
    public required string RelativePath { get; set; }
}