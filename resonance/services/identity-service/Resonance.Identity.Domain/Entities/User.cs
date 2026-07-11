namespace Resonance.Identity.Domain.Entities;

public class User
{
    public Guid Id { get; private set; }
    public string Email { get; private set;} = null!;
    public string PasswordHash { get; private set; } = null!;
    public string DisplayName { get; private set; } = null!;
    public DateTime CreatedAt { get; private set; }

    private User() {}

    public User(Guid id, string email, string passwordHash, string displayName)
    {
        if (string.IsNullOrWhiteSpace(email))
            throw new ArgumentException("Email is required.", nameof(email));
        if(string.IsNullOrWhiteSpace(passwordHash))
            throw new ArgumentException("Password is required.", nameof(passwordHash));
        if (string.IsNullOrWhiteSpace(displayName))
            throw new ArgumentException("Display name is required.", nameof(displayName));
        
        Id = id;
        Email = email.Trim().ToLowerInvariant();
        PasswordHash = passwordHash;
        DisplayName = displayName;
        CreatedAt = DateTime.UtcNow;
    }
}