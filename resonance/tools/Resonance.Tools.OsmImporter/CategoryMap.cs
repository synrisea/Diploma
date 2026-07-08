namespace Resonance.Tools.OsmImporter;

public static class CategoryMap
{
    public static readonly Dictionary<string, string> TagToCategory = new()
    {
        ["amenity=bar"] = "Bar",
        ["amenity=pub"] = "Pub",
        ["amenity=fast_food"] = "Fast Food",
        ["amenity=cafe"] = "Café",
        ["amenity=restaurant"] = "Restaurant",
        ["amenity=library"] = "Library",
        ["leisure=park"] = "Park",
        ["tourism=museum"] = "Museum",
        ["shop=mall"] = "Shopping Mall",
    };

    public static string? Resolve(Dictionary<string, string> tags)
    {
        foreach (var (key,value) in tags)
        {
            if (TagToCategory.TryGetValue($"{key}={value}", out var CategoryName))
                return CategoryName;
        }

        return null;
    }
}