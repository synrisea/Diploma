using MediatR;
using Microsoft.EntityFrameworkCore;
using Resonance.Identity.Application.Common;

namespace Resonance.Identity.Application.Sessions.RevokeSession;

public class RevokeSessionHandler : IRequestHandler<RevokeSessionCommand>
{
    private readonly IApplicationDbContext _context;

    public RevokeSessionHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task Handle(RevokeSessionCommand request, CancellationToken cancellationToken)
    {
        var session = await _context.RefreshTokens.SingleOrDefaultAsync(t => t.Id == request.SessionId && t.UserId == request.UserId, cancellationToken);

        if (session is null)
            return;
        
        session.Revoke();
        await _context.SaveChangesAsync(cancellationToken);
    }
}