namespace Resonance.Identity.Domain.Entities;

public class EmailChangeRequest
{
    public Guid Id { get; private set; }
    public Guid UserId { get; private set; }
    public string NewEmail { get; private set; } = null!;
    public string OldEmailTokenHash { get; private set; } = null!;
    public string NewEmailTokenHash { get; private set; } = null!;
    public DateTime? OldEmailConfirmedAt { get; private set; }
    public DateTime? NewEmailConfirmedAt { get; private set; }
    public DateTime ExpiresAt { get; private set; }
    public DateTime CreatedAt { get; private set; }

    private EmailChangeRequest() {}

    public EmailChangeRequest(Guid id, Guid userId, string newEmail, string oldEmailTokenHash, string newEmailTokenHash, DateTime expiresAt)
    {
        if (userId == Guid.Empty)
            throw new ArgumentException("UserId is required.", nameof(userId));
        if (string.IsNullOrWhiteSpace(newEmail))
            throw new ArgumentException("NewEmail is required.", nameof(newEmail));
        if (string.IsNullOrWhiteSpace(oldEmailTokenHash))
            throw new ArgumentException("OldEmailTokenHash is required.", nameof(oldEmailTokenHash));
        if (string.IsNullOrWhiteSpace(newEmailTokenHash))
            throw new ArgumentException("NewEmailTokenHash is required.", nameof(newEmailTokenHash));

        Id = id;
        UserId = userId;
        NewEmail = newEmail.Trim().ToLowerInvariant();
        OldEmailTokenHash = oldEmailTokenHash;
        NewEmailTokenHash = newEmailTokenHash;
        ExpiresAt = expiresAt;
        CreatedAt = DateTime.UtcNow;
    }

    public bool IsExpired => DateTime.UtcNow > ExpiresAt;
    public bool IsFullyConfirmed => OldEmailConfirmedAt is not null && NewEmailConfirmedAt is not null; 
    public void ConfirmOldEmail() => OldEmailConfirmedAt = DateTime.UtcNow;
    public void ConfirmNewEmail() => NewEmailConfirmedAt = DateTime.UtcNow;
}