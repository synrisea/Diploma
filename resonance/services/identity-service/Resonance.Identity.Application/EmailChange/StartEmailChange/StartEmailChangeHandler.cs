using System.Security.Cryptography;
using System.Text;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Resonance.Identity.Application.Common;
using Resonance.Identity.Domain.Entities;

namespace Resonance.Identity.Application.EmailChange.StartEmailChange;

public class StartEmailChangeHandler : IRequestHandler<StartEmailChangeCommand>
{
    private static readonly TimeSpan RequestLifetime = TimeSpan.FromHours(24);
    
    private readonly IApplicationDbContext _context;
    private readonly IEmailSender _emailSender;
    private readonly IConfiguration _configuration;
    
    public StartEmailChangeHandler(IApplicationDbContext context, IEmailSender emailSender, IConfiguration configuration)
    {
        _context = context;
        _emailSender = emailSender;
        _configuration = configuration;
    }

    public async Task Handle(StartEmailChangeCommand request, CancellationToken cancellationToken)
    {
        var normalizedNewEmail = request.NewEmail.Trim().ToLowerInvariant();

        var user = await _context.Users.SingleOrDefaultAsync(u => u.Id == request.UserId, cancellationToken)
            ?? throw new InvalidOperationException("User not found.");

        if(user.Email == normalizedNewEmail)
            throw new ArgumentException("This email is already attached to your account.");

        var emailTaken = await _context.Users.AnyAsync(u => u.Email == normalizedNewEmail, cancellationToken);

        if (emailTaken)
            throw new InvalidOperationException("An account with this email already exists.");
        
        var oldRawToken = GenerateToken();
        var newRawToken = GenerateToken();
        var baseUrl = _configuration["Identity:PublicBaseUrl"]
            ?? throw new InvalidOperationException("Identity:PublicBaseUrl is not configured.");

        try
        {
            await _emailSender.SendAsync(
                user.Email,
                "Confirm your Resonance email change",
                $"<p>Someone requested to change the email on your Resonance account to <b>{normalizedNewEmail}</b>.</p>" +
                $"<p><a href=\"{baseUrl}/api/identity/email-change/confirm?token={oldRawToken}\">Click here to confirm this change.</a></p>" +
                "<p>If you didn't request this, ignore this email — nothing changes unless both addresses confirm.</p>",
                cancellationToken);

            await _emailSender.SendAsync(
                normalizedNewEmail,
                "Confirm your new Resonance email address",
                "<p>Confirm this is your email address to complete an account email change on Resonance.</p>" +
                $"<p><a href=\"{baseUrl}/api/identity/email-change/confirm?token={newRawToken}\">Click here to confirm.</a></p>",
                cancellationToken);
        }
        catch (EmailDeliveryException ex)
        {
            throw new InvalidOperationException("We couldn't send the confirmation emails. Please try again shortly.", ex);
        }

        var changeRequest = new EmailChangeRequest(
            Guid.NewGuid(), user.Id, normalizedNewEmail,
            Hash(oldRawToken), Hash(newRawToken),
            DateTime.UtcNow.Add(RequestLifetime));

        _context.EmailChangeRequests.Add(changeRequest);
        await _context.SaveChangesAsync(cancellationToken);
    }

    private static string GenerateToken() => Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
    private static string Hash(string raw) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(raw)));
}