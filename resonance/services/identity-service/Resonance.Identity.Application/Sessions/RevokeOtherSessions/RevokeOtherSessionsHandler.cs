using MediatR;
using Microsoft.EntityFrameworkCore;
using Resonance.Identity.Application.Common;

namespace Resonance.Identity.Application.Sessions.RevokeOtherSessions;

public class RevokeOtherSessionsHandler : IRequestHandler<RevokeOtherSessionsCommand>
{
    private readonly IApplicationDbContext _context;
    
    public RevokeOtherSessionsHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task Handle(RevokeOtherSessionsCommand request, CancellationToken cancellationToken)
    {
        var sessions = await _context.RefreshTokens
            .Where(t => t.UserId == request.UserId && t.Id != request.CurrentSessionId && t.RevokedAt == null)
            .ToListAsync(cancellationToken);
        
        foreach(var session in sessions)
            session.Revoke();
        
        await _context.SaveChangesAsync(cancellationToken);
    }
}