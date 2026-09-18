namespace Resonance.Identity.Application.Profile.GetMe;

public record UserProfileDto(
    Guid Id,
    string Email,
    string DisplayName,
    string? AvatarUrl,
    string? PreferencesJson,
    DateTime CreatedAt,
    string? Bio,
    List<string> Interests,
    string? PreferredLanguage);