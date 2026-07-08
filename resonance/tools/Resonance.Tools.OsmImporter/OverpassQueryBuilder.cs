using System.Text;

namespace Resonance.Tools.OsmImporter;

public static class OverpassQueryBuilder
{
    public static string Build(BoundingBox bbox)
    {
        var bboxStr = $"{bbox.MinLat},{bbox.MinLng},{bbox.MaxLat},{bbox.MaxLng}";
        var sb = new StringBuilder();

        sb.AppendLine("[out:json][timeout:60];");
        sb.AppendLine("(");

        foreach(var tagPair in CategoryMap.TagToCategory.Keys)
        {
            var parts = tagPair.Split('=', 2);
            sb.AppendLine($"  node[\"{parts[0]}\"=\"{parts[1]}\"]({bboxStr});");
            sb.AppendLine($"  way[\"{parts[0]}\"=\"{parts[1]}\"]({bboxStr});");
        }

        sb.AppendLine(");");
        sb.AppendLine("out center tags;");
        return sb.ToString();
    }
}