using MediatR;
using Microsoft.EntityFrameworkCore;
using Resonance.Identity.Application.Common;
using Resonance.Identity.Domain.Entities;

namespace Resonance.Identity.Application.Auth.Register;

public class RegisterHandler: IRequestHandler<RegisterCommand, AuthResponseDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtTokenGenerator _jwtTokenGenerator;

    public RegisterHandler(IApplicationDbContext context, IPasswordHasher passwordHasher, IJwtTokenGenerator jwtTokenGenerator)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _jwtTokenGenerator = jwtTokenGenerator;
    }

    public async Task<AuthResponseDto> Handle(RegisterCommand request, CancellationToken cancellationToken)
    {
        if (request.Password.Length < 8)
            throw new ArgumentException("Password must be at least 8 characters.");

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        var emailTaken = await _context.Users.AnyAsync(u => u.Email == normalizedEmail, cancellationToken);
        if (emailTaken)
            throw new InvalidOperationException("An account with this email already exists.");

        var (passwordHash, algorithm) = _passwordHasher.HashNew(request.Password);
        var user = new User(Guid.NewGuid(), normalizedEmail, passwordHash, algorithm, request.DisplayName);
        _context.Users.Add(user);

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