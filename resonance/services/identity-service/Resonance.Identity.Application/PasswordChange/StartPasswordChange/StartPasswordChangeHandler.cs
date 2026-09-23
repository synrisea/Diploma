using System.Security.Cryptography;
using System.Text;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Resonance.Identity.Application.Common;
using Resonance.Identity.Domain.Entities;

namespace Resonance.Identity.Application.PasswordChange.StartPasswordChange;

public class StartPasswordChangeHandler : IRequestHandler<StartPasswordChangeCommand>
{
    private static readonly TimeSpan RequestLifetime = TimeSpan.FromHours(2);

    private readonly IApplicationDbContext _context;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IEmailSender _emailSender;
    private readonly IConfiguration _configuration;

    public StartPasswordChangeHandler(
        IApplicationDbContext context,
        IPasswordHasher passwordHasher,
        IEmailSender emailSender,
        IConfiguration configuration)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _emailSender = emailSender;
        _configuration = configuration;
    }

    public async Task Handle(StartPasswordChangeCommand request, CancellationToken cancellationToken)
    {
        if (request.NewPassword.Length < 8)
            throw new ArgumentException("Password must be at least 8 characters.");

        var user = await _context.Users.SingleOrDefaultAsync(u => u.Id == request.UserId, cancellationToken)
            ?? throw new InvalidOperationException("User not found.");

        if (user.HasPassword)
        {
            if (string.IsNullOrEmpty(request.CurrentPassword))
                throw new ArgumentException("Your current password is required.");

            if (!_passwordHasher.Verify(request.CurrentPassword, user.PasswordHash, user.PasswordHashAlgorithm))
                throw new UnauthorizedAccessException("That isn't your current password.");

            if (request.CurrentPassword == request.NewPassword)
                throw new ArgumentException("The new password must be different from the current one.");
        }

        var pending = await _context.PasswordChangeRequests
            .Where(r => r.UserId == user.Id)
            .ToListAsync(cancellationToken);
        _context.PasswordChangeRequests.RemoveRange(pending);

        var rawToken = GenerateToken();
        var baseUrl = _configuration["Identity:PublicBaseUrl"]
            ?? throw new InvalidOperationException("Identity:PublicBaseUrl is not configured.");

        var action = user.HasPassword ? "change the password" : "set a password";
        var confirmUrl = $"{baseUrl}/api/identity/password-change/confirm?token={rawToken}";

        try
        {
            await _emailSender.SendAsync(
                user.Email,
                user.HasPassword ? "Confirm your Resonance password change" : "Confirm your new Resonance password",
                $"<p>Someone asked to {action} on your Resonance account.</p>" +
                $"<p><a href=\"{confirmUrl}\">Click here to confirm.</a> This link expires in 2 hours.</p>" +
                "<p>If you didn't request this, ignore this email — your current sign-in details keep working.</p>",
                cancellationToken);
        }
        catch (EmailDeliveryException ex)
        {
            throw new InvalidOperationException("We couldn't send the confirmation email. Please try again shortly.", ex);
        }

        var (newPasswordHash, algorithm) = _passwordHasher.HashNew(request.NewPassword);

        _context.PasswordChangeRequests.Add(new PasswordChangeRequest(
            Guid.NewGuid(), user.Id, newPasswordHash, algorithm,
            Hash(rawToken), user.HasPassword,
            DateTime.UtcNow.Add(RequestLifetime)));

        await _context.SaveChangesAsync(cancellationToken);
    }

    private static string GenerateToken() => Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
    private static string Hash(string raw) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(raw)));
}
