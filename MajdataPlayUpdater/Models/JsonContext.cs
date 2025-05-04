using System.Collections.Generic;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace MajdataPlayUpdater.Models;

[JsonSerializable(typeof(List<AssetInfo>))]
public partial class JsonContext : JsonSerializerContext
{
    public static JsonSerializerOptions IndentedOptions => new()
    {
        WriteIndented = true,
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping
    };
}