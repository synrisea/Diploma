using System.Security.Cryptography;
using System.Text;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Resonance.Identity.Application.Common;

namespace Resonance.Identity.Application.EmailChange.ConfirmEmailChange;

public class ConfirmEmailChangeHandler : IRequestHandler<ConfirmEmailChangeCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public ConfirmEmailChangeHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(ConfirmEmailChangeCommand request, CancellationToken cancellationToken)
    {
        var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(request.Token)));

        var changeRequest = await _context.EmailChangeRequests.SingleOrDefaultAsync(
            r => r.OldEmailTokenHash == hash || r.NewEmailTokenHash == hash, cancellationToken)
                ?? throw new InvalidOperationException("This confirmation link is invalid or has already been used.");
        
        if (changeRequest.IsExpired)
            throw new InvalidOperationException("This confirmation link has expired. Please start the email change again.");

        if (changeRequest.OldEmailTokenHash == hash)
            changeRequest.ConfirmOldEmail();
        else
            changeRequest.ConfirmNewEmail();
        
        if (!changeRequest.IsFullyConfirmed)
        {
            await _context.SaveChangesAsync(cancellationToken);
            return false;
        }

        var user = await _context.Users.SingleOrDefaultAsync(u => u.Id == changeRequest.UserId, cancellationToken)
            ?? throw new InvalidOperationException("User not found.");
        
        var stillAvailable = !await _context.Users.AnyAsync(
            u => u.Email == changeRequest.NewEmail && u.Id != user.Id, cancellationToken
        );

        if (!stillAvailable)
            throw new InvalidOperationException("That email address was taken by another account in the meantime.");
        
        user.ChangeEmail(changeRequest.NewEmail);
        _context.EmailChangeRequests.Remove(changeRequest);
        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}