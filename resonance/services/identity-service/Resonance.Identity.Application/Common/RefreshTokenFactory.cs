using System.Security.Cryptography;
using Resonance.Identity.Domain.Entities;

namespace Resonance.Identity.Application.Common;

public static class RefreshTokenFactory
{
    private const int TokenBytes = 32;
    public static readonly TimeSpan Lifetime = TimeSpan.FromDays(30);

    public static (RefreshToken Entity, string RawToken) Create(Guid userId, string? deviceLabel, string? ipAddress)
    {
        var rawToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(TokenBytes));
        var tokenHash = RefreshTokenHasher.Hash(rawToken);
        var entity = new RefreshToken(Guid.NewGuid(), userId, tokenHash, DateTime.UtcNow.Add(Lifetime), deviceLabel, ipAddress);

        return (entity, rawToken);
    }
}