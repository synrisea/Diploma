namespace Resonance.Identity.Domain.Entities;

public class ExternalLogin
{
    public Guid Id { get; private set; }
    public Guid UserId { get; private set; }
    public ExternalLoginProvider Provider { get; private set; }
    public string ProviderUserId { get; private set; } = null!;
    public string Email { get; private set; } = null!;
    public DateTime LinkedAt { get; private set; }

    private ExternalLogin() {}

    public ExternalLogin(Guid id, Guid userId, ExternalLoginProvider provider, string providerUserId, string email)
    {
        if (userId == Guid.Empty)
            throw new ArgumentException("UserId is required.", nameof(userId));
        if (string.IsNullOrWhiteSpace(providerUserId))
            throw new ArgumentException("ProviderUserId is required.", nameof(providerUserId));
        if (string.IsNullOrWhiteSpace(email))
            throw new ArgumentException("Email is required.", nameof(email));

        Id = id;
        UserId = userId;
        Provider = provider;
        ProviderUserId = providerUserId;
        Email = email.Trim().ToLowerInvariant();
        LinkedAt = DateTime.UtcNow;
    } 
}