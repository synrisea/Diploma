using Resonance.Identity.Domain.Entities;

namespace Resonance.Identity.Application.Common;

public interface IJwtTokenGenerator
{
    (string Token, DateTime ExpiresAtUtc) GenerateToken(User user, Guid sessionId);
}
