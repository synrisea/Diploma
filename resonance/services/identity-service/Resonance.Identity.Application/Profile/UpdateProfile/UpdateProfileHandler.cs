using MediatR;
using Microsoft.EntityFrameworkCore;
using Resonance.Identity.Application.Common;

namespace Resonance.Identity.Application.Profile.UpdateProfile;

public class UpdateProfileHandler : IRequestHandler<UpdateProfileCommand>
{
    private const int MaxInterests = 10;
    private const int MaxInterestLength = 30;

    private readonly IApplicationDbContext _context;

    public UpdateProfileHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task Handle(UpdateProfileCommand request, CancellationToken cancellationToken)
    {
        var user = await _context.Users.SingleOrDefaultAsync(u => u.Id == request.UserId, cancellationToken)
            ?? throw new InvalidOperationException("User not found.");

        if (request.DisplayName is not null)
            user.UpdateDisplayName(request.DisplayName);

        if (request.PreferencesJson is not null)
            user.UpdatePreferences(request.PreferencesJson);

        if (request.Bio is not null)
            user.UpdateBio(request.Bio);

        if (request.Interests is not null)
        {
            var interests = request.Interests
                .Select(i => i.Trim())
                .Where(i => i.Length > 0)
                .Select(i => i.Length > MaxInterestLength ? i[..MaxInterestLength] : i)
                .Distinct()
                .Take(MaxInterests)
                .ToList();
            user.UpdateInterests(interests);
        }

        if (request.PreferredLanguage is not null)
            user.UpdatePreferredLanguage(request.PreferredLanguage);

        await _context.SaveChangesAsync(cancellationToken);
    }
}