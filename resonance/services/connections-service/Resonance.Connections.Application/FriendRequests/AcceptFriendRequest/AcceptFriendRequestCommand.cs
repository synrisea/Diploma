using MediatR;

namespace Resonance.Connections.Application.FriendRequests.AcceptFriendRequest;

public enum AcceptFriendRequestStatus
{
    Accepted,
    NotFound,
    Forbidden,
}

public record AcceptFriendRequestCommand(Guid RequestId, Guid CallerId) : IRequest<AcceptFriendRequestStatus>;
