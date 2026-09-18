using MediatR;
using Microsoft.EntityFrameworkCore;
using Resonance.Connections.Application.Common;

namespace Resonance.Connections.Application.FriendRequests.DeclineFriendRequest;

public class DeclineFriendRequestHandler : IRequestHandler<DeclineFriendRequestCommand, DeclineFriendRequestStatus>
{
    private readonly IApplicationDbContext _context;

    public DeclineFriendRequestHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<DeclineFriendRequestStatus> Handle(DeclineFriendRequestCommand request, CancellationToken cancellationToken)
    {
        var friendRequest = await _context.FriendRequests.SingleOrDefaultAsync(f => f.Id == request.RequestId, cancellationToken);

        if (friendRequest is null)
            return DeclineFriendRequestStatus.NotFound;

        if (friendRequest.RecipientId != request.CallerId)
            return DeclineFriendRequestStatus.Forbidden;

        friendRequest.Decline();
        await _context.SaveChangesAsync(cancellationToken);
        return DeclineFriendRequestStatus.Declined;
    }
}
