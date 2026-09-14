using MediatR;
using Microsoft.EntityFrameworkCore;
using Resonance.Identity.Application.Common;

namespace Resonance.Identity.Application.Auth.Refresh;

public class RefreshTokenHandler : IRequestHandler<RefreshTokenCommand, AuthResponseDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IJwtTokenGenerator _jwtTokenGenerator;

    public RefreshTokenHandler(IApplicationDbContext context, IJwtTokenGenerator jwtTokenGenerator)
    {
        _context = context;
        _jwtTokenGenerator = jwtTokenGenerator;
    }

    public async Task<AuthResponseDto> Handle(RefreshTokenCommand request, CancellationToken cancellationToken)
    {
        var tokenHash = RefreshTokenHasher.Hash(request.RefreshToken);
        var existing = await _context.RefreshTokens.SingleOrDefaultAsync(t => t.TokenHash == tokenHash, cancellationToken);

        if (existing is null)
            throw new UnauthorizedAccessException("Invalid refresh token.");

        if (existing.RevokedAt is not null)
        {
            var allActiveTokens = await _context.RefreshTokens
                .Where(t => t.UserId == existing.UserId && t.RevokedAt == null)
                .ToListAsync(cancellationToken);

            foreach (var token in allActiveTokens)
                token.Revoke();

            await _context.SaveChangesAsync(cancellationToken);
            throw new UnauthorizedAccessException("This refresh token has already been used. All sessions have been revoked as a precaution.");
        }

        if (existing.ExpiresAt <= DateTime.UtcNow)
            throw new UnauthorizedAccessException("Refresh token has expired.");

        var user = await _context.Users.SingleOrDefaultAsync(u => u.Id == existing.UserId, cancellationToken)
            ?? throw new UnauthorizedAccessException("Invalid refresh token.");

        var (newTokenEntity, rawRefreshToken) = RefreshTokenFactory.Create(user.Id, request.DeviceLabel, request.IpAddress);
        _context.RefreshTokens.Add(newTokenEntity);
        existing.Revoke(newTokenEntity.Id);

        var (accessToken, accessTokenExpiresAt) = _jwtTokenGenerator.GenerateToken(user, newTokenEntity.Id);

        await _context.SaveChangesAsync(cancellationToken);

        return new AuthResponseDto(
            user.Id, user.Email, user.DisplayName,
            accessToken, accessTokenExpiresAt,
            rawRefreshToken, newTokenEntity.ExpiresAt);
    }
}      