using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore.ValueGeneration.Internal;

namespace Resonance.Tools.OsmImporter;


public class OverpassCenter
{
    [JsonPropertyName("lat")]
    public double Lat { get; set; }

    [JsonPropertyName("lon")]
    public double Lon {get; set; }
}

public class OverpassElement
{
    [JsonPropertyName("id")]
    public long Id { get; set; }

    [JsonPropertyName("lat")]
    public double? Lat { get; set; }
    
    [JsonPropertyName("lon")]
    public double? Lon { get; set; }

    [JsonPropertyName("center")]
    public OverpassCenter? Center { get; set; }

    [JsonPropertyName("tags")]
    public Dictionary<string, string>? Tags { get; set; } 
}
public class OverpassResponse
{
    [JsonPropertyName("elements")]
    public List<OverpassElement> Elements { get; set; } = new();
}