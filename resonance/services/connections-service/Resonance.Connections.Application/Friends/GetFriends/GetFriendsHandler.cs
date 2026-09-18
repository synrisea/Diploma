using MediatR;
using Microsoft.EntityFrameworkCore;
using Resonance.Connections.Application.Common;
using Resonance.Connections.Domain.Entities;

namespace Resonance.Connections.Application.Friends.GetFriends;

public class GetFriendsHandler : IRequestHandler<GetFriendsQuery, List<Guid>>
{
    private readonly IApplicationDbContext _context;

    public GetFriendsHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<Guid>> Handle(GetFriendsQuery request, CancellationToken cancellationToken)
    {
        var accepted = await _context.FriendRequests
            .Where(f => f.Status == FriendRequestStatus.Accepted && (f.RequesterId == request.CallerId || f.RecipientId == request.CallerId))
            .ToListAsync(cancellationToken);

        return accepted.Select(f => f.OtherParticipant(request.CallerId)).ToList();
    }
}
