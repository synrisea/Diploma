namespace Resonance.Identity.Application.Auth;

public record AuthResponseDto(Guid UserId, string Email, string DisplayName, string Token, DateTime ExpiresAtUtc);