using MediatR;

namespace Resonance.Connections.Application.Friends.GetFriends;

public record GetFriendsQuery(Guid CallerId) : IRequest<List<Guid>>;
