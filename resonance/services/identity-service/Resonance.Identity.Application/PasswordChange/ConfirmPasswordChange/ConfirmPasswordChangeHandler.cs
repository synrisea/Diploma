using System.Security.Cryptography;
using System.Text;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Resonance.Identity.Application.Common;

namespace Resonance.Identity.Application.PasswordChange.ConfirmPasswordChange;

public class ConfirmPasswordChangeHandler : IRequestHandler<ConfirmPasswordChangeCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public ConfirmPasswordChangeHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(ConfirmPasswordChangeCommand request, CancellationToken cancellationToken)
    {
        var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(request.Token)));

        var changeRequest = await _context.PasswordChangeRequests.SingleOrDefaultAsync(
            r => r.TokenHash == hash, cancellationToken)
                ?? throw new InvalidOperationException("This confirmation link is invalid or has already been used.");

        if (changeRequest.IsExpired)
        {
            _context.PasswordChangeRequests.Remove(changeRequest);
            await _context.SaveChangesAsync(cancellationToken);
            throw new InvalidOperationException("This confirmation link has expired. Please start again from Settings.");
        }

        var user = await _context.Users.SingleOrDefaultAsync(u => u.Id == changeRequest.UserId, cancellationToken)
            ?? throw new InvalidOperationException("User not found.");

        user.SetPassword(changeRequest.NewPasswordHash, changeRequest.NewPasswordHashAlgorithm);

        var replacedExistingPassword = changeRequest.ReplacesExistingPassword;

        if (replacedExistingPassword)
        {
            var activeTokens = await _context.RefreshTokens
                .Where(t => t.UserId == user.Id && t.RevokedAt == null)
                .ToListAsync(cancellationToken);

            foreach (var token in activeTokens)
                token.Revoke();
        }

        _context.PasswordChangeRequests.Remove(changeRequest);
        await _context.SaveChangesAsync(cancellationToken);

        return replacedExistingPassword;
    }
}
