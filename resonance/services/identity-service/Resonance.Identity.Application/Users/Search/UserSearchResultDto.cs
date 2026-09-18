namespace Resonance.Identity.Application.Users.Search;

public record UserSearchResultDto(Guid Id, string DisplayName, string? AvatarUrl, string? Bio, DateTime MemberSince);
