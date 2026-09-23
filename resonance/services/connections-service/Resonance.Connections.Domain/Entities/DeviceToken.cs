namespace Resonance.Connections.Domain.Entities;

public class DeviceToken
{
    public Guid Id { get; private set; }
    public Guid UserId { get; private set; }
    public string Token { get; private set; } = string.Empty;
    public string Platform { get; private set; } = string.Empty;
    public DateTime CreatedAt { get; private set; }

    private DeviceToken() {}

    public DeviceToken(Guid id, Guid userId, string token, string platform)
    {
        if (userId == Guid.Empty)
            throw new ArgumentException("A user is required.");
        if (string.IsNullOrWhiteSpace(token))
            throw new ArgumentException("A push token is required.");

        Id = id;
        UserId = userId;
        Token = token.Trim();
        Platform = string.IsNullOrWhiteSpace(platform) ? "unknown" : platform.Trim().ToLowerInvariant();
        CreatedAt = DateTime.UtcNow;
    }

    public void ReassignTo(Guid userId, string platform)
    {
        if (userId == Guid.Empty)
            throw new ArgumentException("A user is required.");

        UserId = userId;
        Platform = string.IsNullOrWhiteSpace(platform) ? Platform : platform.Trim().ToLowerInvariant();
        CreatedAt = DateTime.UtcNow;
    }
}
