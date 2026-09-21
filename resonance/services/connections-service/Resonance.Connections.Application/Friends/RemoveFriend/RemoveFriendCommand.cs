using MediatR;

namespace Resonance.Connections.Application.Friends.RemoveFriend;

public record RemoveFriendCommand(Guid CallerId, Guid FriendUserId) : IRequest;
