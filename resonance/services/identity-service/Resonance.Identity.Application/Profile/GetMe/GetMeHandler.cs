using MediatR;
using Microsoft.EntityFrameworkCore;
using Resonance.Identity.Application.Common;

namespace Resonance.Identity.Application.Profile.GetMe;

public class GetMeHandler : IRequestHandler<GetMeQuery, UserProfileDto>
{
    private readonly IApplicationDbContext _context;
    
    public GetMeHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<UserProfileDto> Handle(GetMeQuery request, CancellationToken cancellationToken)
    {
        var user = await _context.Users.SingleOrDefaultAsync(u => u.Id == request.UserId, cancellationToken)
            ?? throw new InvalidOperationException("User not found.");

        return new UserProfileDto(user.Id, user.Email, user.DisplayName, user.AvatarUrl, user.PreferencesJson, user.CreatedAt);
    }
}