using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using NetTopologySuite;
using NetTopologySuite.Geometries;
using Resonance.Places.Domain.Entities;
using Resonance.Places.Infrastructure.Persistance;
using Resonance.Tools.OsmImporter;

var config = new ConfigurationBuilder()
    .SetBasePath(AppContext.BaseDirectory)
    .AddJsonFile("appsettings.json", optional:false)
    .Build();

var connectionString = config.GetConnectionString("Default")
    ?? throw new InvalidOperationException("Missing connection string 'Default");

var bbox = new BoundingBox(
    config.GetValue<double>("Overpass:MinLat"),
    config.GetValue<double>("Overpass:MinLng"),
    config.GetValue<double>("Overpass:MaxLat"),
    config.GetValue<double>("Overpass:MaxLng"));

var overpassEndpoint = config["Overpass:Endpoint"] ?? "https://overpass-api.de/api/interpreter";

Console.WriteLine("Querying Overpass API...");
var query = OverpassQueryBuilder.Build(bbox);

using var http = new HttpClient();
http.DefaultRequestHeaders.UserAgent.ParseAdd("ResonanceOsmImporter/1.0");

var response = await http.PostAsync(overpassEndpoint, new StringContent(query, Encoding.UTF8, "text/plain"));
response.EnsureSuccessStatusCode();

var json = await response.Content.ReadAsStringAsync();
var overpassResult = JsonSerializer.Deserialize<OverpassResponse>(json, new JsonSerializerOptions
{
    PropertyNameCaseInsensitive = true
}) ?? new OverpassResponse();

Console.WriteLine($"Overpass returned {overpassResult.Elements.Count} elements.");

var dbOptions = new DbContextOptionsBuilder<ApplicationDbContext>()
    .UseNpgsql(connectionString, npgsql => npgsql.UseNetTopologySuite())
    .Options;

await using var db = new ApplicationDbContext(dbOptions);

var geometryFactory = NtsGeometryServices.Instance.CreateGeometryFactory(srid: 4326);

// 1. Make sure every category we might need already exists
var distinctCategoryNames = CategoryMap.TagToCategory.Values.Distinct().ToList();
var categoryIds = await db.Categories
    .Where(c => distinctCategoryNames.Contains(c.Name))
    .ToDictionaryAsync(c => c.Name, c => c.Id);

foreach (var name in distinctCategoryNames)
{
    if (!categoryIds.ContainsKey(name))
    {
        var category = new Category(Guid.NewGuid(), name);
        db.Categories.Add(category);
        categoryIds[name] = category.Id;
    }
}
await db.SaveChangesAsync();

// 2. Skip anything already imported (safe to re-run)
var existingOsmIds = await db.Places
    .Where(p => p.OsmId != null)
    .Select(p => p.OsmId!.Value)
    .ToHashSetAsync();

var imported = 0;
var skipped = 0;

foreach (var element in overpassResult.Elements)
{
    if (element.Tags is null) continue;

    var categoryName = CategoryMap.Resolve(element.Tags);
    if (categoryName is null) continue;

    if (existingOsmIds.Contains(element.Id))
    {
        skipped++;
        continue;
    }

    var lat = element.Lat ?? element.Center?.Lat;
    var lon = element.Lon ?? element.Center?.Lon;
    if (lat is null || lon is null) continue;

    var name = element.Tags.GetValueOrDefault("name", categoryName);
    var address = BuildAddress(element.Tags);
    var openingHours = element.Tags.GetValueOrDefault("opening_hours");
    var location = geometryFactory.CreatePoint(new Coordinate(lon.Value, lat.Value));

    var place = new Place(
        id: Guid.NewGuid(),
        name: name,
        categoryId: categoryIds[categoryName],
        location: location,
        address: address,
        openingHours: openingHours,
        osmId: element.Id);

    db.Places.Add(place);
    imported++;
}

await db.SaveChangesAsync();
Console.WriteLine($"Imported {imported} new places, skipped {skipped} already in the database.");

static string? BuildAddress(Dictionary<string, string> tags)
{
    var street = tags.GetValueOrDefault("addr:street");
    var house = tags.GetValueOrDefault("addr:housenumber");
    if (street is null) return null;
    return house is null ? street : $"{street} {house}";
}