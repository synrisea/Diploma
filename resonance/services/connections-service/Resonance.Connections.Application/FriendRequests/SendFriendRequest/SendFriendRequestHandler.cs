using MediatR;
using Microsoft.EntityFrameworkCore;
using Resonance.Connections.Application.Common;
using Resonance.Connections.Domain.Entities;

namespace Resonance.Connections.Application.FriendRequests.SendFriendRequest;

public class SendFriendRequestHandler : IRequestHandler<SendFriendRequestCommand, SendFriendRequestOutcome>
{
    private readonly IApplicationDbContext _context;

    public SendFriendRequestHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<SendFriendRequestOutcome> Handle(SendFriendRequestCommand request, CancellationToken cancellationToken)
    {
        if (request.RequesterId == request.RecipientId)
            throw new ArgumentException("Cannot send a friend request to yourself.");

        if (await BlockChecks.IsBlockedEitherWay(_context, request.RequesterId, request.RecipientId, cancellationToken))
            return new SendFriendRequestOutcome(SendFriendRequestStatus.Blocked, null);

        var existing = await _context.FriendRequests.SingleOrDefaultAsync(
            f => (f.RequesterId == request.RequesterId && f.RecipientId == request.RecipientId) ||
                 (f.RequesterId == request.RecipientId && f.RecipientId == request.RequesterId),
            cancellationToken);

        if (existing is not null)
        {
            if (existing.Status == FriendRequestStatus.Accepted)
                return new SendFriendRequestOutcome(SendFriendRequestStatus.AlreadyFriends, existing.Id);

            if (existing.Status == FriendRequestStatus.Pending)
                return new SendFriendRequestOutcome(SendFriendRequestStatus.AlreadyPending, existing.Id);

            _context.FriendRequests.Remove(existing);
        }

        var friendRequest = new FriendRequest(Guid.NewGuid(), request.RequesterId, request.RecipientId);
        _context.FriendRequests.Add(friendRequest);
        await _context.SaveChangesAsync(cancellationToken);
        return new SendFriendRequestOutcome(SendFriendRequestStatus.Sent, friendRequest.Id);
    }
}
