using MediatR;

namespace Resonance.Connections.Application.FriendRequests.SendFriendRequest;

public enum SendFriendRequestStatus
{
    Sent,
    AlreadyPending,
    AlreadyFriends,
    Blocked,
}

public record SendFriendRequestOutcome(SendFriendRequestStatus Status, Guid? RequestId);

public record SendFriendRequestCommand(Guid RequesterId, Guid RecipientId) : IRequest<SendFriendRequestOutcome>;
