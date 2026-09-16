using System.Security.Cryptography;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Resonance.Identity.Application.Common;
using Resonance.Identity.Domain.Entities;

namespace Resonance.Identity.Application.Auth.GoogleSignIn;

public class GoogleSignInHandler : IRequestHandler<GoogleSignInCommand, AuthResponseDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtTokenGenerator _jwtTokenGenerator;

    public GoogleSignInHandler(IApplicationDbContext context, IPasswordHasher passwordHasher, IJwtTokenGenerator jwtTokenGenerator)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _jwtTokenGenerator = jwtTokenGenerator;
    }

    public async Task<AuthResponseDto> Handle(GoogleSignInCommand request, CancellationToken cancellationToken)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        var externalLogin = await _context.ExternalLogins.SingleOrDefaultAsync(
            e => e.Provider == ExternalLoginProvider.Google && e.ProviderUserId == request.ProviderUserId, cancellationToken
        );

        User user;

        if(externalLogin is not null)
        {
            user = await _context.Users.SingleOrDefaultAsync(u => u.Id == externalLogin.UserId, cancellationToken)
                ?? throw new InvalidOperationException("Linked account not found.");
        }
        else
        {
            var existingUser = await _context.Users.SingleOrDefaultAsync(u => u.Email == normalizedEmail, cancellationToken);

            if (existingUser is not null)
            {
                user = existingUser;
            }
            else
            {
                var (passwordHash, algorithm) = _passwordHasher.HashNew(Convert.ToHexString(RandomNumberGenerator.GetBytes(32)));
                user = new User(Guid.NewGuid(), normalizedEmail, passwordHash, algorithm, request.DisplayName);
                _context.Users.Add(user);
            }

            var newExternalLogin = new ExternalLogin(Guid.NewGuid(), user.Id, ExternalLoginProvider.Google, request.ProviderUserId, normalizedEmail);
            _context.ExternalLogins.Add(newExternalLogin);
        }

        var (refreshTokenEntity, rawRefreshToken) = RefreshTokenFactory.Create(user.Id, request.DeviceLabel, request.IpAddress);
        _context.RefreshTokens.Add(refreshTokenEntity);

        var (accessToken, accessTokenExpiresAt) = _jwtTokenGenerator.GenerateToken(user, refreshTokenEntity.Id);

        await _context.SaveChangesAsync(cancellationToken);

        return new AuthResponseDto(
            user.Id, user.Email, user.DisplayName,
            accessToken, accessTokenExpiresAt,
            rawRefreshToken, refreshTokenEntity.ExpiresAt);
    }
}
