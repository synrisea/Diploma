using MediatR;

namespace Resonance.Connections.Application.FriendRequests.DeclineFriendRequest;

public enum DeclineFriendRequestStatus
{
    Declined,
    NotFound,
    Forbidden,
}

public record DeclineFriendRequestCommand(Guid RequestId, Guid CallerId) : IRequest<DeclineFriendRequestStatus>;
