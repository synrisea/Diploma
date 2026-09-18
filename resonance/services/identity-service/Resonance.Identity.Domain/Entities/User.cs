namespace Resonance.Identity.Domain.Entities;

public class User
{
    public Guid Id { get; private set; }
    public string Email { get; private set;} = null!;
    public string PasswordHash { get; private set; } = null!;
    public PasswordHashAlgorithm PasswordHashAlgorithm { get; private set;}
    public string DisplayName { get; private set; } = null!;
    public string? PreferencesJson {get; private set;}
    public DateTime CreatedAt { get; private set; }
    public string? AvatarUrl { get; private set; }
    public string? Bio { get; private set; }
    public List<string> Interests { get; private set; } = [];
    public string? PreferredLanguage { get; private set; }

    private User() {}

    public User(Guid id, string email, string passwordHash, PasswordHashAlgorithm passwordHashAlgorithm, string displayName)
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
        PasswordHashAlgorithm = passwordHashAlgorithm;
        DisplayName = displayName;
        CreatedAt = DateTime.UtcNow;
    }

    public void UpdateDisplayName(string displayName)
    {
        if (string.IsNullOrWhiteSpace(displayName))
            throw new ArgumentException("Display name is required.", nameof(displayName));

        DisplayName = displayName.Trim();
    }

    public void UpdatePreferences(string? preferencesJson)
    {
        PreferencesJson = preferencesJson;
    }

    public void UpdateAvatarUrl(string? avatarUrl)
    {
        AvatarUrl = avatarUrl;
    }

    public void UpdateBio(string? bio)
    {
        Bio = bio;
    }

    public void UpdateInterests(List<string> interests)
    {
        Interests = interests;
    }

    public void UpdatePreferredLanguage(string? preferredLanguage)
    {
        PreferredLanguage = preferredLanguage;
    }

    public void ChangeEmail(string newEmail)
    {
        if (string.IsNullOrWhiteSpace(newEmail))
            throw new ArgumentException("Email is required.", nameof(newEmail));

        Email = newEmail.Trim().ToLowerInvariant();
    }
}