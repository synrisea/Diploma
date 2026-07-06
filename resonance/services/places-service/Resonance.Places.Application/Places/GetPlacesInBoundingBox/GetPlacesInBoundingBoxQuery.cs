using MediatR;

namespace Resonance.Places.Application.Places.GetPlacesInBoundingBox;

public record GetPlacesInBoundingBoxQuery(
    double MinLat,
    double MinLng,
    double MaxLat,
    double MaxLng
) : IRequest<List<PlaceDto>>;