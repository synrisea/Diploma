using MediatR;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite;
using NetTopologySuite.Geometries;
using Resonance.Places.Application.Common;

namespace Resonance.Places.Application.Places.GetPlacesInBoundingBox;

public class GetPlacesInBoundingBoxHandler : IRequestHandler<GetPlacesInBoundingBoxQuery, List<PlaceDto>>
{
    private static readonly GeometryFactory geometryFactory = NtsGeometryServices.Instance.CreateGeometryFactory(srid:4326);
    private readonly IApplicationDbContext _context;

    public GetPlacesInBoundingBoxHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<PlaceDto>> Handle(GetPlacesInBoundingBoxQuery request, CancellationToken cancellationToken)
    {
        var envelope = new Envelope(request.MinLng, request.MaxLng, request.MinLat, request.MaxLat);
        var boundingBox = geometryFactory.ToGeometry(envelope);

        return await _context.Places
            .Where(p => p.Location.Within(boundingBox))
            .Select(p => new PlaceDto(
                p.Id,
                p.Name,
                p.Category != null ? p.Category.Name : null,
                p.Location.Y, // latitude
                p.Location.X, // longitude
                p.Address
            )).ToListAsync(cancellationToken);
    }
}