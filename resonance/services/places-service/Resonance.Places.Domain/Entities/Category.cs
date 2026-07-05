namespace Resonance.Places.Domain.Entities;

public class Category
{
    public Guid Id { get; private set; }
    public string Name { get; private set; } = null!;
    public string? OsmTagMapping { get; private set; } // e.g. "amenity=cafe"

    private Category() { }

    public Category(Guid id, string name, string? osmTagMapping = null)
    {
        if (string.IsNullOrEmpty(name))
            throw new ArgumentException("Category name is required.", nameof(name));

        Id = id;
        Name = name;
        OsmTagMapping = osmTagMapping;
    }
}