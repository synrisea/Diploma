using MediatR;
using Microsoft.EntityFrameworkCore;
using Resonance.Identity.Application.Common;

namespace Resonance.Identity.Application.Users.Search;

public class SearchUsersHandler : IRequestHandler<SearchUsersQuery, List<UserSearchResultDto>>
{
    private readonly IApplicationDbContext _context;

    public SearchUsersHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<UserSearchResultDto>> Handle(SearchUsersQuery request, CancellationToken cancellationToken)
    {
        var query = request.Query.Trim().ToLower();
        if (query.Length == 0)
            return [];

        return await _context.Users
            .Where(u => u.DisplayName.ToLower().Contains(query))
            .OrderBy(u => u.DisplayName)
            .Take(20)
            .Select(u => new UserSearchResultDto(u.Id, u.DisplayName, u.AvatarUrl, u.Bio, u.CreatedAt))
            .ToListAsync(cancellationToken);
    }
}
