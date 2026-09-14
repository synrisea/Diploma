using MediatR;
using Microsoft.EntityFrameworkCore;
using Resonance.Identity.Application.Common;

namespace Resonance.Identity.Application.Profile.UpdateProfile;

public class UpdateProfileHandler : IRequestHandler<UpdateProfileCommand>
{
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
        
        await _context.SaveChangesAsync(cancellationToken);
    }
}