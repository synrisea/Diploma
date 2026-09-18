namespace Resonance.Connections.Application.FriendRequests.GetFriendRequests;

public record FriendRequestDto(Guid Id, Guid OtherUserId, bool IsIncoming, DateTime CreatedAt);
