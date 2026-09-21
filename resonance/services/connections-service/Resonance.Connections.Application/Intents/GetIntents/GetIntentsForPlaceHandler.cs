using MediatR;
using Microsoft.EntityFrameworkCore;
using Resonance.Connections.Application.Common;

namespace Resonance.Connections.Application.Intents.GetIntents;

public class GetIntentsForPlaceHandler : IRequestHandler<GetIntentsForPlaceQuery, List<VisitIntentDto>>
{
    private readonly IApplicationDbContext _context;

    public GetIntentsForPlaceHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<VisitIntentDto>> Handle(GetIntentsForPlaceQuery request, CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;

        var blockedUserIds = await _context.Blocks
            .Where(b => b.BlockerUserId == request.CallerId || b.BlockedUserId == request.CallerId)
            .Select(b => b.BlockerUserId == request.CallerId ? b.BlockedUserId : b.BlockerUserId)
            .ToListAsync(cancellationToken);

        return await _context.VisitIntents
            .Where(i => i.PlaceId == request.PlaceId && i.ExpiresAt > now && !blockedUserIds.Contains(i.UserId))
            .OrderBy(i => i.VisitDate).ThenBy(i => i.CreatedAt)
            .Select(i => new VisitIntentDto(i.Id, i.UserId, i.PlaceId, i.VisitDate, i.IntentTag, i.CreatedAt, i.ExpiresAt))
            .ToListAsync(cancellationToken);
    }
}
