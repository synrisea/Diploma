using MediatR;
using Microsoft.EntityFrameworkCore;
using Resonance.Identity.Application.Common;
using Resonance.Identity.Domain.Entities;

namespace Resonance.Identity.Application.Auth.Register;

public class RegisterHandler: IRequestHandler<RegisterCommand, AuthResponseDto>
{
    private const int TokenExpiryMinutes = 1440;

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
        
        var passwordHash = _passwordHasher.Hash(request.Password);
        var user = new User(Guid.NewGuid(), normalizedEmail, passwordHash, request.DisplayName);

        _context.Users.Add(user);
        await _context.SaveChangesAsync(cancellationToken);

        var token = _jwtTokenGenerator.GenerateToken(user);
        return new AuthResponseDto(user.Id, user.Email, user.DisplayName, token, DateTime.UtcNow.AddMinutes(TokenExpiryMinutes));
    }
}