using MediatR;
using Microsoft.EntityFrameworkCore;
using Resonance.Identity.Application.Common;

namespace Resonance.Identity.Application.Profile.GetPublicProfile;

public class GetPublicProfileHandler : IRequestHandler<GetPublicProfileQuery, PublicProfileDto?>
{
    private readonly IApplicationDbContext _context;

    public GetPublicProfileHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PublicProfileDto?> Handle(GetPublicProfileQuery request, CancellationToken cancellationToken)
    {
        var user = await _context.Users.SingleOrDefaultAsync(u => u.Id == request.UserId, cancellationToken);
        if (user is null) return null;

        return new PublicProfileDto(user.Id, user.DisplayName, user.AvatarUrl, user.Bio, user.Interests, user.PreferredLanguage, user.CreatedAt);
    }
}
