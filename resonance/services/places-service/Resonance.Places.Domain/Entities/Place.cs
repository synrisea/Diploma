using NetTopologySuite.Geometries;

namespace Resonance.Places.Domain.Entities;

public class Place
{
    public Guid Id { get; private set; }
    public long? OsmId { get; private set; }
    public string Name { get; private set; } = null!;
    public Guid CategoryId { get; private set; }
    public Category? Category { get; private set; }     
    public Point Location { get; private set; } = null!;  
    public string? Address { get; private set; }
    public string? OpeningHours { get; private set; }      
    public DateTime CreatedAt { get; private set; }

    private Place() { }

    public Place(Guid id, string name, Guid categoryId, Point location,
        string? address = null, string? openingHours = null, long? osmId = null)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Place name is required.", nameof(name));

        Id = id;
        Name = name;
        CategoryId = categoryId;
        Location = location ?? throw new ArgumentNullException(nameof(location));
        Address = address;
        OpeningHours = openingHours;
        OsmId = osmId;
        CreatedAt = DateTime.UtcNow;
    }
}