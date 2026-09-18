namespace Resonance.Identity.Application.Profile.GetPublicProfile;

public record PublicProfileDto(
    Guid Id,
    string DisplayName,
    string? AvatarUrl,
    string? Bio,
    List<string> Interests,
    string? PreferredLanguage,
    DateTime MemberSince);
