namespace Resonance.Places.Application.Places.GetPlacesInBoundingBox;

public record PlaceDto(
    Guid Id,
    string Name,
    string? CategoryName,
    double Latitude,
    double Longitude,
    string? Address
);

