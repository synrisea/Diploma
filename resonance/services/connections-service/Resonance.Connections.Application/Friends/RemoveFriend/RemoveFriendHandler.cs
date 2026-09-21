using MediatR;
using Microsoft.EntityFrameworkCore;
using Resonance.Connections.Application.Common;
using Resonance.Connections.Domain.Entities;

namespace Resonance.Connections.Application.Friends.RemoveFriend;

public class RemoveFriendHandler : IRequestHandler<RemoveFriendCommand>
{
    private readonly IApplicationDbContext _context;

    public RemoveFriendHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task Handle(RemoveFriendCommand request, CancellationToken cancellationToken)
    {
        var friendship = await _context.FriendRequests.SingleOrDefaultAsync(
            f => f.Status == FriendRequestStatus.Accepted &&
                 ((f.RequesterId == request.CallerId && f.RecipientId == request.FriendUserId) ||
                  (f.RequesterId == request.FriendUserId && f.RecipientId == request.CallerId)),
            cancellationToken);

        if (friendship is null) return;

        _context.FriendRequests.Remove(friendship);
        await _context.SaveChangesAsync(cancellationToken);
    }
}
