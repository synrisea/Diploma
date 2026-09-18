using MediatR;
using Microsoft.EntityFrameworkCore;
using Resonance.Connections.Application.Common;
using Resonance.Connections.Domain.Entities;

namespace Resonance.Connections.Application.FriendRequests.GetFriendRequests;

public class GetFriendRequestsHandler : IRequestHandler<GetFriendRequestsQuery, List<FriendRequestDto>>
{
    private readonly IApplicationDbContext _context;

    public GetFriendRequestsHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<FriendRequestDto>> Handle(GetFriendRequestsQuery request, CancellationToken cancellationToken)
    {
        var pending = await _context.FriendRequests
            .Where(f => f.Status == FriendRequestStatus.Pending && (f.RequesterId == request.CallerId || f.RecipientId == request.CallerId))
            .ToListAsync(cancellationToken);

        return pending
            .Select(f => new FriendRequestDto(f.Id, f.OtherParticipant(request.CallerId), f.RecipientId == request.CallerId, f.CreatedAt))
            .OrderByDescending(d => d.CreatedAt)
            .ToList();
    }
}
