namespace Resonance.Identity.Application.Profile.GetMe;

public record UserProfileDto(Guid Id, string Email, string DisplayName, string? PreferencesJson, DateTime CreatedAt);