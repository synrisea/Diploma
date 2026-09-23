using Microsoft.EntityFrameworkCore;

namespace Resonance.Identity.Application.Common;

public static class DeviceSessions
{
    public static async Task RevokePreviousAsync(
        IApplicationDbContext context, Guid userId, string? deviceLabel, string? ipAddress, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(deviceLabel)) return;

        var now = DateTime.UtcNow;
        var previous = await context.RefreshTokens
            .Where(t => t.UserId == userId
                        && t.RevokedAt == null
                        && t.ExpiresAt > now
                        && t.DeviceLabel == deviceLabel
                        && t.IpAddress == ipAddress)
            .ToListAsync(cancellationToken);

        foreach (var token in previous)
            token.Revoke();
    }
}
