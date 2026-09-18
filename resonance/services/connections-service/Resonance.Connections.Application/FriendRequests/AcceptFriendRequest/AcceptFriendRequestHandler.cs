using MediatR;
using Microsoft.EntityFrameworkCore;
using Resonance.Connections.Application.Common;

namespace Resonance.Connections.Application.FriendRequests.AcceptFriendRequest;

public class AcceptFriendRequestHandler : IRequestHandler<AcceptFriendRequestCommand, AcceptFriendRequestStatus>
{
    private readonly IApplicationDbContext _context;

    public AcceptFriendRequestHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<AcceptFriendRequestStatus> Handle(AcceptFriendRequestCommand request, CancellationToken cancellationToken)
    {
        var friendRequest = await _context.FriendRequests.SingleOrDefaultAsync(f => f.Id == request.RequestId, cancellationToken);

        if (friendRequest is null)
            return AcceptFriendRequestStatus.NotFound;

        if (friendRequest.RecipientId != request.CallerId)
            return AcceptFriendRequestStatus.Forbidden;

        friendRequest.Accept();
        await _context.SaveChangesAsync(cancellationToken);
        return AcceptFriendRequestStatus.Accepted;
    }
}
