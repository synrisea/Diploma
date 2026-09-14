using MediatR;
using Microsoft.EntityFrameworkCore;
using Resonance.Identity.Application.Common;

namespace Resonance.Identity.Application.Users.GetByIds;

public class GetUsersByIdsHandler : IRequestHandler<GetUsersByIdsQuery, List<UserSummaryDto>>
{
    private readonly IApplicationDbContext _context;

    public GetUsersByIdsHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<UserSummaryDto>> Handle(GetUsersByIdsQuery request, CancellationToken cancellationToken)
    {
        if (request.Ids.Count == 0)
            return [];

        return await _context.Users
            .Where(u => request.Ids.Contains(u.Id))
            .Select(u => new UserSummaryDto(u.Id, u.DisplayName))
            .ToListAsync(cancellationToken);
    }
}
