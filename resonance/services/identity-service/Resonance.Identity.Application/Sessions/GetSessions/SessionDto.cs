namespace Resonance.Identity.Application.Sessions.GetSessions;

public record SessionDto(Guid Id, string? DeviceLabel, string? IpAddress, DateTime CreatedAt, DateTime ExpiresAt, bool IsCurrent);