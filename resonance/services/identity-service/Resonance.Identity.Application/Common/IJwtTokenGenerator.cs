using Resonance.Identity.Domain.Entities;

namespace Resonance.Identity.Application.Common;

public interface IJwtTokenGenerator
{
    string GenerateToken(User user);
}
