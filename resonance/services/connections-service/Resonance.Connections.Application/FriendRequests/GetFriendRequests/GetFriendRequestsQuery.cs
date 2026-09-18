using MediatR;

namespace Resonance.Connections.Application.FriendRequests.GetFriendRequests;

public record GetFriendRequestsQuery(Guid CallerId) : IRequest<List<FriendRequestDto>>;
