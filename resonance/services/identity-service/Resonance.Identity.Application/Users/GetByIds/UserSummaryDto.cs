namespace Resonance.Identity.Application.Users.GetByIds;

public record UserSummaryDto(Guid Id, string DisplayName, string? AvatarUrl);
