namespace Resonance.Identity.Domain.Entities;

public class PasswordChangeRequest
{
    public Guid Id { get; private set; }
    public Guid UserId { get; private set; }
    public string NewPasswordHash { get; private set; } = null!;
    public PasswordHashAlgorithm NewPasswordHashAlgorithm { get; private set; }
    public string TokenHash { get; private set; } = null!;
    public bool ReplacesExistingPassword { get; private set; }
    public DateTime ExpiresAt { get; private set; }
    public DateTime CreatedAt { get; private set; }

    private PasswordChangeRequest() {}

    public PasswordChangeRequest(
        Guid id,
        Guid userId,
        string newPasswordHash,
        PasswordHashAlgorithm newPasswordHashAlgorithm,
        string tokenHash,
        bool replacesExistingPassword,
        DateTime expiresAt)
    {
        if (userId == Guid.Empty)
            throw new ArgumentException("UserId is required.", nameof(userId));
        if (string.IsNullOrWhiteSpace(newPasswordHash))
            throw new ArgumentException("NewPasswordHash is required.", nameof(newPasswordHash));
        if (string.IsNullOrWhiteSpace(tokenHash))
            throw new ArgumentException("TokenHash is required.", nameof(tokenHash));

        Id = id;
        UserId = userId;
        NewPasswordHash = newPasswordHash;
        NewPasswordHashAlgorithm = newPasswordHashAlgorithm;
        TokenHash = tokenHash;
        ReplacesExistingPassword = replacesExistingPassword;
        ExpiresAt = expiresAt;
        CreatedAt = DateTime.UtcNow;
    }

    public bool IsExpired => DateTime.UtcNow > ExpiresAt;
}
