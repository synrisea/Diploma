using MediatR;
using Microsoft.EntityFrameworkCore;
using Resonance.Identity.Application.Common;

namespace Resonance.Identity.Application.Auth.Login;

public class LoginHandler : IRequestHandler<LoginCommand, AuthResponseDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtTokenGenerator _jwtTokenGenerator;

    public LoginHandler(IApplicationDbContext context, IPasswordHasher passwordHasher, IJwtTokenGenerator jwtTokenGenerator)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _jwtTokenGenerator = jwtTokenGenerator;
    }

    public async Task<AuthResponseDto> Handle(LoginCommand request, CancellationToken cancellationToken)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var user = await _context.Users.SingleOrDefaultAsync(u => u.Email == normalizedEmail, cancellationToken);

        if (user is null || !_passwordHasher.Verify(request.Password, user.PasswordHash, user.PasswordHashAlgorithm))
            throw new UnauthorizedAccessException("Invalid email or password.");
        
          await DeviceSessions.RevokePreviousAsync(_context, user.Id, request.DeviceLabel, request.IpAddress, cancellationToken);

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