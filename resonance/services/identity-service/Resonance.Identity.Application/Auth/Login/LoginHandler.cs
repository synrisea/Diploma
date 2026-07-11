using MediatR;
using Microsoft.EntityFrameworkCore;
using Resonance.Identity.Application.Common;

namespace Resonance.Identity.Application.Auth.Login;

public class LoginHandler : IRequestHandler<LoginCommand, AuthResponseDto>
{
    private const int TokenExpiryMinutes = 1440;

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

        if (user is null || !_passwordHasher.Verify(request.Password, user.PasswordHash))
            throw new UnauthorizedAccessException("Invalid email or password.");
        
        var token = _jwtTokenGenerator.GenerateToken(user);
        return new AuthResponseDto(user.Id, user.Email, user.DisplayName, token, DateTime.UtcNow.AddMinutes(TokenExpiryMinutes));
    }
}