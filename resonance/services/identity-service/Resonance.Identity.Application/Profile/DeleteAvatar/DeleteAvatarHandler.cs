using MediatR;
using Microsoft.EntityFrameworkCore;
using Resonance.Identity.Application.Common;
using Resonance.Identity.Domain.Entities;

namespace Resonance.Identity.Application.Profile.DeleteAvatar;

public class DeleteAvatarHandler : IRequestHandler<DeleteAvatarCommand>
{
    private readonly IApplicationDbContext _context;
    private readonly IAvatarStorage _avatarStorage;

    public DeleteAvatarHandler(IApplicationDbContext context, IAvatarStorage avatarStorage)
    {
        _context = context;
        _avatarStorage = avatarStorage;
    }

    public async Task Handle(DeleteAvatarCommand request, CancellationToken cancellationToken)
    {
        var user = await _context.Users.SingleOrDefaultAsync(u => u.Id == request.UserId, cancellationToken)
            ?? throw new InvalidOperationException("User not found.");
        
        await _avatarStorage.DeleteAllAsync(request.UserId, cancellationToken);
        user.UpdateAvatarUrl(null);
        await _context.SaveChangesAsync(cancellationToken);
    }
}