using MediatR;
using Microsoft.EntityFrameworkCore;
using Resonance.Identity.Application.Common;

namespace Resonance.Identity.Application.Sessions.GetSessions;

public class GetSessionsHandler : IRequestHandler<GetSessionsQuery, List<SessionDto>>
{
    private readonly IApplicationDbContext _context;

    public GetSessionsHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<SessionDto>> Handle(GetSessionsQuery request, CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;

        return await _context.RefreshTokens
            .Where(t => t.UserId == request.UserId && t.RevokedAt == null && t.ExpiresAt > now)
            .OrderByDescending(t => t.CreatedAt)
            .Select(t => new SessionDto(t.Id, t.DeviceLabel, t.IpAddress, t.CreatedAt, t.ExpiresAt, t.Id == request.CurrentSessionId))
            .ToListAsync(cancellationToken);
    }
}