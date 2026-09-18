namespace Resonance.Identity.Api.Contracts;
public record UpdateProfileRequest(
    string? DisplayName,
    string? PreferencesJson,
    string? Bio,
    List<string>? Interests,
    string? PreferredLanguage);