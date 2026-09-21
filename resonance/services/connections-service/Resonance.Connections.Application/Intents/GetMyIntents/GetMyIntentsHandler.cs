using MediatR;
using Microsoft.EntityFrameworkCore;
using Resonance.Connections.Application.Common;
using Resonance.Connections.Application.Intents.GetIntents;

namespace Resonance.Connections.Application.Intents.GetMyIntents;

public class GetMyIntentsHandler : IRequestHandler<GetMyIntentsQuery, List<VisitIntentDto>>
{
    private readonly IApplicationDbContext _context;

    public GetMyIntentsHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<VisitIntentDto>> Handle(GetMyIntentsQuery request, CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;

        return await _context.VisitIntents
            .Where(i => i.UserId == request.UserId && i.ExpiresAt > now)
            .OrderBy(i => i.VisitDate)
            .Select(i => new VisitIntentDto(i.Id, i.UserId, i.PlaceId, i.VisitDate, i.IntentTag, i.CreatedAt, i.ExpiresAt))
            .ToListAsync(cancellationToken);
    }
}
